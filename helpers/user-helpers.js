var db = require('../config/connection')
var collection = require('../config/collections')
const bcrypt = require('bcrypt')
var objectId = require('mongodb').ObjectId
const { resolve } = require('promise')
const { response } = require('express')
module.exports = {
    doSignup: (userData) => {
        //console.log(userData)
        return new Promise(async (resolve, reject) => {
            userData.Password = await bcrypt.hash(userData.Password, 10)
            db.get().collection(collection.USER_COLLECTION).insertOne(userData).then((data) => {
                //console.log(data)
                resolve(data.insertedId)
            })
        })

    },
    doLogin: (userData) => {
        return new Promise(async (resolve, reject) => {
            let loginStatus = false
            let response = {}
            let user = await db.get().collection(collection.USER_COLLECTION).findOne({ Email: userData.Email })
            if (user) {
                bcrypt.compare(userData.Password, user.Password).then((status) => {
                    if (status) {
                        console.log("login success");
                        response.user = user
                        response.status = true
                        resolve(response)
                    } else {
                        console.log("login failed")
                        resolve({ status: false })
                    }
                })
            } else {
                console.log('login failed')
                resolve({ status: false })
            }
        })
    },
    addToCart: (proId, userId) => {
        let proObj = {
            item: objectId(proId),
            quantity: 1
        }
        return new Promise(async (resolve, reject) => {
            let userCart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })
            if (userCart) {
                let proExist = userCart.products.findIndex(product => product.item == proId)
                console.log("index", proExist)
                if (proExist != -1) {
                    db.get().collection(collection.CART_COLLECTION)
                        .updateOne({ user: objectId(userId), 'products.item': objectId(proId) },
                            {
                                $inc: { 'products.$.quantity': 1 }
                            }).then(() => {
                                resolve()
                            })
                } else {
                    db.get().collection(collection.CART_COLLECTION)
                        .updateOne({ user: objectId(userId) },
                            {

                                $push: { products: proObj }

                            }).then((response) => {
                                resolve()
                            })
                }
            } else {
                let cartObj = {
                    user: objectId(userId),
                    products: [proObj]
                }
                db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response) => {
                    resolve()
                })
            }
        })
    },
    getCartProducts: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cartItems = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1,
                        quantity: 1,
                        product: {
                            $arrayElemAt: ['$product', 0]
                        }
                    }
                }
                // {
                //     $lookup: {
                //         from: collection.PRODUCT_COLLECTION,
                //         let: { prodList: '$products' },
                //         pipeline: [
                //             {
                //                 $match: {
                //                     $expr: {
                //                         $in: ['$_id', "$$prodList"]
                //                     }
                //                 }
                //             }
                //         ],
                //         as: 'cartItems'

                //     }
                // }
            ]).toArray()
            console.log(cartItems)
            resolve(cartItems)
        })
    },
    getCartCount: (userId) => {
        return new Promise(async (resolve, reject) => {
            let count = 0
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })
            if (cart) {
                count = cart.products.length
            }
            resolve(count)
        })
    },
    // changeProductQuantity: ({ cartId, proId, count }) => {
    //     console.log("cart",cartId);
    //     count=parseInt(count)
    //     return new Promise(async (resolve, reject) => {
    //         db.get().collection(collection.CART_COLLECTION)
    //             .updateOne({_id:objectId(cartId), 'products.item': objectId(proId) },
    //                 {
    //                     $inc: { 'products.$.quantity': count }
    //                 }).then(() => {
    //                     resolve()
    //                 })
    //     })
    // }
    changeProductQuantity: (details) => {
        console.log("details", details);
        count = parseInt(details.count)
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CART_COLLECTION)
                .updateOne({ _id: objectId(details.cart), 'products.item': objectId(details.product) },
                    {
                        $inc: { 'products.$.quantity': count }
                    }).then(() => {
                        resolve()
                    })
        })
    }

    // .then(async (response) => {
    //     console.log("resp", response)
    //     let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ _id: objectId(details.cart) })
    //     if (cart) {
    //         var quantity = cart.products.find(x => x.item == details.product).quantity
    //         console.log("quantity", quantity)

    //     }
    //     resolve(quantity)
    // })
}