const { MongoClient } = require("mongodb");
const {
  formatWorkinghourForResponse,
  createWorkinghour
} = require("./helpers");

const DB_NAME = "hrlab-timetracking";
const PROJECTS_COLLECTION = "projects";
const WORKINGHOURS_COLLECTION = "workinghours";

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
      const projects = this.db.collection(PROJECTS_COLLECTION);

      const results = await projects
        .find(
          {
            user_ids: Number(req.query.user_id)
          },
          { user_ids: 0, _id: 1 }
        )
        .toArray();
      return {
        // data: results
        data: results.map((project) => {
          return {
            ...project,
            id: project?._id
          };
        })
      };
      // return { data: ["affe"] };
    } catch (err) {
      reply.send(err);
    }
  }

  async workinghoursByUserId(req, reply) {
    try {
      const workinghours = this.db.collection(WORKINGHOURS_COLLECTION);
      const projects = this.db.collection(PROJECTS_COLLECTION);
      const projectArray = await projects.find().toArray();
      const results = await workinghours
        .find(
          {
            user_id: Number(req.params.userId)
          },
          { _id: 1 }
        )
        .toArray();
      return {
        data: results.map(({ ...rest }) =>
          formatWorkinghourForResponse(
            {
              ...rest,
              project_name: projectArray.find(
                (project) => project._id === rest.project_id
              )?.name
            },
            true
          )
        )
      };
    } catch (err) {
      reply.send(err);
    }
  }

  async startTimetracking(req, reply) {
    try {
      const workinghours = this.db.collection(WORKINGHOURS_COLLECTION);
      const lastWHs = await workinghours
        .find({
          user_id: req.params.userId,
          log_type: 0,
          end_date: {
            $lt: req.body.start_date
            // $gt: new Date(new Date(req.body.start_date).setUTCHours(0, 0, 0, 0))
          }
        })
        .limit(1)
        .sort({ end_date: -1 })
        .toArray();
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
            log_type: 0,
            action: "pause",
            start_date: lastWH.end_date,
            end_date: req.body.start_date
          });
        }
      }
      const result = await createWorkinghour(this.db, {
        ...req.body,
        user_id: req.params.userId,
        end_date: null,
        log_type: 1,
        action: "work"
      });

      return {
        data: formatWorkinghourForResponse(result)
      };
    } catch (err) {
      return reply.send(err);
    }
  }

  async stopTimetracking(req, reply) {
    try {
      const workinghours = this.db.collection(WORKINGHOURS_COLLECTION);
      const itemInDb = await workinghours.findOne({
        _id: req.params.workinghourId
      });
      const hours =
        Math.abs(new Date(req.body.end_date) - new Date(itemInDb.start_date)) /
        36e5;
      const item = {
        end_date: req.body.end_date,
        workinghours: hours,
        log_type: 0,
        updated_at: new Date()
      };

      const result = await workinghours.findOneAndUpdate(
        { _id: req.params.workinghourId },
        { $set: item },
        { returnNewDocument: true }
      );
      return {
        data: formatWorkinghourForResponse({ ...result.value, ...item })
      };
    } catch (err) {
      return reply.send(err);
    }
  }
}

module.exports = (opts) => new Service(opts);
