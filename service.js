const { MongoClient } = require("mongodb");
const {
  formatWorkinghourForResponse,
  createWorkinghour
} = require("./helpers");

const DB_NAME = "hrlab-timetracking";
const PROJECTS_COLLECTION = "projects";
const WORKINGHOURS_COLLECTION = "workinghours";
const USERS_COLLECTION = "users";

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

  async login(req, reply) {
    try {
      const { email, password } = req.body.user;
      if (email !== "user@mail.com" || password !== "Password12345")
        return reply
          .code(404)
          .send({ message: "The login data are not valid!" });
      const token = await reply.jwtSign({ payload: email });
      reply.code(302).header("Authorization", `Bearer ${token}`).send(null);
    } catch (err) {
      return reply.send(err);
    }
  }

  async initialize(req, reply) {
    try {
      const users = this.db.collection(USERS_COLLECTION);
      const user = await users.findOne({
        _id: 1
      });

      const system_role_permissions = [
        {
          section_name: "projects",
          read_access: true,
          create_access: true,
          update_access: true,
          delete_access: true,
          accesses: ["own_access", "managed_user_access", "all_access"],
          own_permission: {
            read_access: true,
            create_access: true,
            update_access: true,
            delete_access: true
          },
          own_access: "all_permission",
          special_access_permissions: {
            read_access: false,
            create_access: false,
            update_access: false,
            delete_access: false
          },
          user_permissions: [
            {
              read_access: false,
              create_access: false,
              update_access: false,
              delete_access: false,
              user_id: 1
            }
          ]
        },
        {
          section_name: "time_tracking",
          read_access: true,
          create_access: true,
          update_access: true,
          delete_access: true,
          accesses: ["managed_user_access", "all_access", "own_access"],
          own_permission: {
            read_access: true,
            create_access: true,
            update_access: true,
            delete_access: true
          },
          own_access: "all_permission",
          special_access_permissions: {
            read_access: false,
            create_access: false,
            update_access: false,
            delete_access: false
          },
          user_permissions: [
            {
              read_access: true,
              create_access: true,
              update_access: true,
              delete_access: true,
              user_id: 1
            }
          ]
        }
      ];

      const userData = {
        id: 1,
        first_name: user.first_name,
        last_name: user.last_name,
        locale: "en",
        system_role_permissions
      };

      const subscriptionData = {
        subscription_id: 1,
        is_subscription_valid: true,
        is_licence_valid: true
      };

      reply.code(200).send({
        userData,
        subscriptionData
      });
    } catch (err) {
      return reply.send(err);
    }
  }
}

module.exports = (opts) => new Service(opts);
