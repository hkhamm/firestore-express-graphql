# firebase-express-graphql

An example of a [GraphQL](https://graphql.org/) setup with a Firebase Firestore backend. Uses [Express](https://www.apollographql.com/) and [Express GraphQL](http://expressjs.com/).

## Setup

### Code Setup

```bash
git clone https://github.com/hkhamm/firestore-express-graphql.git
cd firestore-express-graphql
yarn install
```

### Firebase Setup

#### Service Account

1. If you don't already have a Firebase project, add one in the Firebase console. The Add project dialog also gives you the option to add Firebase to an existing Google Cloud Platform project.
2. Navigate to the Service Accounts tab in your project's settings page.
3. Click the Generate New Private Key button at the bottom of the Firebase Admin SDK section of the Service Accounts tab.

After you click the button, a JSON file containing your service account's credentials will be downloaded. Rename this to `service-account.json` and add it to the top level of the repo (e.g. `/path/to/firebase-firestore-graphql/service-account.json`).

#### Firestore

1. From the Firebase console, create a new Firestore database.
2. Create two collections, one of tweets and one of users. Follow these types:

```typescript
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
```

## Run the server

```bash
yarn start
```

If you navigate to `/playground` you should see a GraphQL playground where you can query your API.

## Sample query

```graphql
{
  user(id: "1") {
    name
    tweets {
      text
      likes
    }
  }
}
```
