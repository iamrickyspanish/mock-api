const { MongoClient } = require("mongodb");
const usersData = require("./users.json");
const projectData = require("./projects.json");
const counterData = require("./counters.json");

const client = new MongoClient(process.env.DB_HOST);

// constants
const COUNTERS_COLLECTION = "counters";
const PROJECTS_COLLECTION = "projects";
const USERS_COLLECTION = "users";
const WORKINGHOUR_COLLECTION = "workinghours";
const DB_NAME = "hrlab-timetracking";

// helpers

const createCollection = async (db, name) => {
  const collections = await db.listCollections().toArray();
  const exists = !!collections.find((c) => c.name === name);
  const collection = exists
    ? db.collection(name)
    : await db.createCollection(name);
  await collection.deleteMany();
  return collection;
};

const seedCounters = async (db) => {
  const collection = await createCollection(db, COUNTERS_COLLECTION);
  await collection.insertMany(counterData);
};

const seedUsers = async (db) => {
  const collection = await createCollection(db, USERS_COLLECTION);
  await collection.insertMany(usersData);
};

const seedProjects = async (db) => {
  const collection = await createCollection(db, PROJECTS_COLLECTION);
  await collection.insertMany(projectData);
};

const seedWorkinghours = async (db) => {
  await createCollection(db, WORKINGHOUR_COLLECTION);
};

// seed
(async () => {
  await client.connect();

  const db = client.db(DB_NAME);

  await seedCounters(db);
  await seedUsers(db);
  await seedProjects(db);
  await seedWorkinghours(db);

  await client.close();
})();
