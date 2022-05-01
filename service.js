const DB_NAME = "hrlab-timetracking";

const { MongoClient } = require("mongodb");
const { getNextSequenceValue } = require("./src/helpers");

const formatWorkinghourForResponse = (workinghour) => {
  const { _id, ...rest } = workinghour;
  delete rest.additional_params;
  return {
    ...rest,
    log_type: rest.log_type ? "entry" : "log",
    // action: "work",
    id: _id
  };
};

const createWorkinghour = async (db, data) => {
  const nextId = await getNextSequenceValue(db, "workinghourId");
  const createdAt = new Date();
  const workinghours = db.collection("workinghours");

  const item = {
    ...data,
    _id: nextId,
    comment: "null",
    created_at: createdAt,
    internal_creation: true,
    workinghour_period: "daily",
    resource_url: "xxx",
    workinghours_saldo_id: 1,
    action: data.action || "work",
    workinghours: 0,
    tenant_id: 1,
    updated_at: createdAt
  };
  await workinghours.insertOne(item);
  return item;
};

class Service {
  constructor() {
    (async () => {
      const client = new MongoClient(process.env.DB_HOST);
      await client.connect();
      this.db = client.db(DB_NAME);
    })();
  }

  async listProjects(req, reply) {
    try {
      const projects = this.db.collection("projects");
      const results = await projects
        .find(
          {
            user_ids: Number(req.query.user_id)
          },
          { user_ids: 0, _id: 1 }
        )
        .toArray();
      return {
        data: results.map(({ _id, ...rest }) => ({
          ...rest,
          id: _id
        }))
      };
    } catch (err) {
      reply.send(err);
    }
  }

  async workinghoursByUserId(req, reply) {
    try {
      const workinghours = this.db.collection("workinghours");
      const results = await workinghours
        .find(
          {
            user_id: Number(req.params.userId)
            // log_type: 1,
          },
          { _id: 1 }
        )
        .toArray();
      return {
        data: results.map(({ _id, ...rest }) =>
          formatWorkinghourForResponse({
            ...rest,
            id: _id
          })
        )
      };
    } catch (err) {
      reply.send(err);
    }
  }

  async startTimetracking(req, reply) {
    try {
      const workinghours = this.db.collection("workinghours");
      // const nextId = await getNextSequenceValue(this.db, "workinghourId");
      console.log("??????", req.body.start_date);
      const lastWHs = await workinghours
        .find({
          user_id: req.params.userId,
          // log_type: 0
          end_date: {
            $lt: req.body.start_date
            // $gt: new Date(new Date(req.body.start_date).setUTCHours(0, 0, 0, 0))
          }
        })
        .limit(1)
        .sort({ end_date: -1 })
        .toArray();
      console.log("last wh=========>", lastWHs);
      if (lastWHs.length) {
        if (
          new Date(req.body.start_date).setUTCHours(0, 0, 0, 0) ===
          new Date().setUTCHours(0, 0, 0, 0)
        ) {
          // fill pause between last entry on this day and this new entry
          const lastWH = lastWHs[0];
          await createWorkinghour(this.db, {
            ...req.body,
            user_id: req.params.userId,
            log_type: 1,
            action: "pause",
            start_date: lastWH.end_date,
            end_date: req.body.start_date
          });
        }
      }
      const result = await createWorkinghour(this.db, {
        ...req.body,
        user_id: req.params.userId
      });
      return {
        data: formatWorkinghourForResponse({ ...result, id: result.insertedId })
      };
    } catch (err) {
      return reply.send(err);
    }
  }

  async stopTimetracking(req, reply) {
    try {
      const workinghours = this.db.collection("workinghours");
      const itemInDb = await workinghours.findOne({
        _id: req.params.workinghourId
      });
      const hours =
        Math.abs(new Date(req.body.end_date) - new Date(itemInDb.start_date)) /
        36e5;
      const item = {
        end_date: req.body.end_date,
        workinghours: hours,
        updated_at: new Date()
      };

      const result = await workinghours.findOneAndUpdate(
        { _id: req.params.workinghourId },
        { $set: item },
        { returnNewDocument: true }
      );
      return {
        data: formatWorkinghourForResponse(result.value)
      };
    } catch (err) {
      return reply.send(err);
    }
  }
}

module.exports = (opts) => new Service(opts);
