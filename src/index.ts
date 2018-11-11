import express, { NextFunction, Request, Response } from 'express'
import graphqlHTTP from 'express-graphql'
import { buildSchema } from 'graphql'
import firestore from './firestore'
import expressjwt from 'express-jwt'
import { SECRET } from './config'
import jwt from 'jsonwebtoken'
import expressPlayground from 'graphql-playground-middleware-express'

interface User {
    id: string
    name: string
    screenName: string
    statusesCount: number
}

interface Tweet {
    id: string
    likes: number
    text: string
    userId: string
}

// Construct a schema, using GraphQL schema language
const apiSchema = buildSchema(`
    # A Twitter User
    type User {
        id: ID!
        name: String!
        screenName: String!
        statusesCount: Int!
        tweets: [Tweet]!
    }

    # A Tweet Object
    type Tweet {
        id: ID!
        text: String!
        userId: String!
        user: User!
        likes: Int!
    }

    type Query {
        tweets: [Tweet]
        user(id: String!): User
    }

    type Mutation {
        addUser(id: String!, name: String!, screenName: String!): User
        addTweet(id: ID!, text: String!, userId: String!): Tweet
    }
`)

class User {
    constructor(user: User) {
        this.id = user.id
        this.name = user.name
        this.screenName = user.screenName
        this.statusesCount = user.statusesCount
    }

    tweets = async () => {
        try {
            const userTweets = await firestore
                .collection('tweets')
                .where('userId', '==', this.id)
                .get()
            return userTweets.docs.map((tweet) => {
                const tweetData = tweet.data() as Tweet | undefined
                if (tweetData) {
                    return new Tweet(tweetData)
                } else {
                    return new Error('Tweets not found')
                }
            }) as Tweet[]
        } catch (error) {
            throw new Error(error)
        }
    }
}

class Tweet {
    constructor(tweet: Tweet) {
        this.id = tweet.id
        this.userId = tweet.userId
        this.likes = tweet.likes
        this.text = tweet.text
    }

    user = async () => {
        try {
            const tweetAuthor = await firestore.doc(`users/${this.userId}`).get()
            return new User(tweetAuthor.data() as User)
        } catch (error) {
            throw new Error(error)
        }
    }
}

// The root provides a resolver function for each API endpoint
const apiRoot = {
    tweets: async () => {
        const tweets = await firestore.collection('tweets').get()
        return tweets.docs.map((tweet) => {
            const tweetData = tweet.data() as Tweet | undefined
            if (tweetData) {
                return new Tweet(tweetData)
            } else {
                throw new Error('Tweets not found')
            }
        }) as Tweet[]
    },
    user: async ({ id }: { id: string }) => {
        try {
            const userDoc = await firestore.doc(`users/${id}`).get()
            const user = userDoc.data() as User | undefined
            if (user) {
                return new User(user)
            } else {
                throw new Error('User ID not found')
            }
        } catch (error) {
            throw new Error(error)
        }
    },
    addUser: async ({ id, name, screenName }: { id: string; name: string; screenName: string }) => {
        try {
            await firestore
                .collection('users')
                .doc(id)
                .set({ id, name, screenName, statusesCount: 0 })
            const userDoc = await firestore.doc(`users/${id}`).get()
            const user = userDoc.data() as User | undefined
            if (user) {
                return new User(user)
            } else {
                throw new Error('Failed to add user')
            }
        } catch (error) {
            throw new Error(error)
        }
    },
    addTweet: async ({ id, text, userId }: { id: string; text: string; userId: string }) => {
        try {
            await firestore
                .collection('tweets')
                .doc(id)
                .set({ id, text, userId, likes: 0 })
            const tweetDoc = await firestore.doc(`tweets/${id}`).get()
            const tweet = tweetDoc.data() as Tweet | undefined
            if (tweet) {
                return new Tweet(tweet)
            } else {
                throw new Error('Failed to add tweet')
            }
        } catch (error) {
            throw new Error(error)
        }
    }
}

const api = graphqlHTTP({
    schema: apiSchema,
    rootValue: apiRoot,
    graphiql: false
})

const loginSchema = buildSchema(`
    type Token {
        token: String!
    }

    type Query {
        login(email: String!): Token
    }
`)

const loginRoot = {
    login: async ({ email }: { email: string }) => {
        if (email === 'hkhamm@gmail.com') {
            return {
                token: jwt.sign({}, SECRET)
            }
        } else {
            return new Error('Email not found')
        }
    }
}

const login = graphqlHTTP({
    schema: loginSchema,
    rootValue: loginRoot,
    graphiql: false
})

const app = express()
app.use(
    expressjwt({
        secret: SECRET,
        requestProperty: 'token',
        strict: false,
        getToken: (req: any) => {
            if (req.headers && req.headers.authorization) {
                const decoded = jwt.verify(req.headers.authorization, SECRET)
                if (decoded) {
                    return req.headers.authorization
                }
            }
        }
    }).unless({
        path: ['/login', '/playground']
    })
)
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (err.name === 'UnauthorizedError') {
        res.status(200).send('Unauthorized: you must login and send a valid JWT in your authorization header')
    }
})
app.use('/login', login)
app.use('/api', api)
app.get('/playground', expressPlayground({ endpoint: '/login' }))
app.listen(4000, () => {
    console.log('GraphQL Playground at http://localhost:4000/playground')
    console.log('Login at http://localhost:4000/login')
    console.log('GraphQL API at http://localhost:4000/api')
})
