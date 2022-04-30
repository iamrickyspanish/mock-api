const DB_NAME = "hrlab-timetracking";

const { MongoClient } = require("mongodb");
const { getNextSequenceValue } = require("./src/helpers");

const formatWorkinghourForResponse = (workinghour) => {
  return {
    ...workinghour,
    log_type: workinghour.log_type ? "entry" : "log",
    action: workinghour.action ? "work" : "pause"
  };
};

class Service {
  constructor() {
    (async () => {
      const client = new MongoClient(process.env.DB_HOST);
      await client.connect();
      this.db = client.db(DB_NAME);
    })();
  }

  // Operation: listProjects
  // URL: /projects/time_tracking
  // summary:  fetches projects for timetracking
  // req.query
  //   type: object
  //   properties:
  //     order_by:
  //       type: string
  //       default: created_at DESC
  //       description: order of the returned projects.
  //     template:
  //       type: string
  //       default: index_search
  //       description: template to return only desired data.
  //     user_id:
  //       type: integer
  //       description: id of a user, returns only projects a given user is a member of.
  //     valid_on_date:
  //       type: string
  //       format: date
  //       description: >-
  //         date without time - only projects will be returned that are active on a
  //         given date. For our purpose this should be the current date
  //   required:
  //     - order_by
  //     - template
  //     - user_id
  //     - valid_on_date
  //
  // valid responses
  //   '200':
  //     description: returns a list of projects
  //     content:
  //       application/json:
  //         schema:
  //           type: object
  //           properties:
  //             data:
  //               type: array
  //               items:
  //                 type: object
  //                 properties:
  //                   id:
  //                     type: integer
  //                     example: 1
  //                   root_company_id:
  //                     type: integer
  //                     description: root company the project is related to
  //                     example: 1
  //                   name:
  //                     type: string
  //                     example: Project A
  //

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
      reply.send({
        data: results.map(({ _id, ...rest }) => ({
          ...rest,
          id: _id
        }))
      });
    } catch (err) {
      reply.send(err);
    }
  }

  // Operation: workinghoursByUserId
  // URL: /workinghour_logs/users/:userId/workinghours
  // summary:  fetches logged workinghour of a given user
  // req.params
  //   type: object
  //   properties:
  //     userId:
  //       type: integer
  //       description: id of user for whom to track time
  //   required:
  //     - userId
  //
  // valid responses
  //   '200':
  //     description: >-
  //       returns logged workinghours of  given user as well as information if the
  //       timetracking is locked
  //     content:
  //       application/json:
  //         schema:
  //           type: object
  //           properties:
  //             locked_time_tracking:
  //               type: boolean
  //               description: timetracking is locked and therefore no workinghours can be logged
  //               default: false
  //             data:
  //               type: array
  //               items:
  //                 type: object
  //                 properties:
  //                   start_date:
  //                     type: string
  //                     format: date-time
  //                     example: '2022-04-13T19:51:07Z'
  //                   end_date:
  //                     type: string
  //                     format: date-time
  //                     example: '2022-04-13T22:30:03Z'
  //                   project_name:
  //                     type: string
  //                     example: Project A
  //                   action:
  //                     type: string
  //                     description: >-
  //                       type of tracked time. 'work' for worktime, 'pause' for
  //                       breaks
  //                     enum:
  //                       - work
  //                       - pause
  //                   log_type:
  //                     type: string
  //                     description: >-
  //                       type of log action as string, occurs when receiving
  //                       workinghour data from the server. 'log' when the
  //                       timetracking is started, 'entry' once the timetracking
  //                       stopped
  //                     enum:
  //                       - log
  //                       - entry
  //

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
      reply.send({
        data: results.map(({ _id, ...rest }) =>
          formatWorkinghourForResponse({
            ...rest,
            id: _id
          })
        )
      });
    } catch (err) {
      reply.send(err);
    }
  }

  // Operation: startTimetracking
  // URL: /workinghour_logs/users/:userId/workinghours
  // summary:  start timetracking
  // req.params
  //   type: object
  //   properties:
  //     userId:
  //       type: integer
  //       description: id of user for whom to track time
  //   required:
  //     - userId
  //
  // req.body
  //   required:
  //     - log_type
  //     - start_date
  //     - user_id
  //     - workinghour_period
  //   type: object
  //   properties:
  //     start_date:
  //       type: string
  //       description: the time the logging was started
  //       format: date-time
  //     workinghour_period:
  //       type: integer
  //       description: >-
  //         use when sending workinghour data to the server. use 0 for anything
  //         timetracking related
  //       enum:
  //         - 0
  //     log_type:
  //       type: integer
  //       description: >-
  //         type of log action as number, use when sending workinghour data to the
  //         server. 1 when the timetracking ist started, 0 once the timetracking
  //         stopped
  //       enum:
  //         - 1
  //         - 0
  //     user_id:
  //       type: integer
  //       description: id of the user that the workinghours are logged for
  //       example: 1
  //     project_id:
  //       type: integer
  //       description: id of the project that the workinghours are logged for
  //       example: 1
  //
  // valid responses
  //   '201':
  //     description: ''
  //     content:
  //       application/json:
  //         schema:
  //           type: object
  //           properties:
  //             comment:
  //               type: string
  //             created_at:
  //               type: string
  //               format: date-time
  //               example: '2022-04-29T17:21:06.417Z'
  //             end_date:
  //               type: string
  //               format: date-time
  //               example: '2022-04-29T19:22:00Z'
  //             id:
  //               type: integer
  //               example: 1
  //             internal_creation:
  //               description: >-
  //                 describes how the workinghour was created. will be always 'true'
  //                 in our use case
  //               type: boolean
  //               example: true
  //             log_type:
  //               type: string
  //               description: >-
  //                 type of log action as string, occurs when receiving workinghour
  //                 data from the server. 'log' when the timetracking is started,
  //                 'entry' once the timetracking stopped
  //               enum:
  //                 - log
  //                 - entry
  //             project_id:
  //               type: integer
  //               example: 1
  //             resource_url:
  //               type: string
  //             start_date:
  //               type: string
  //               format: date-time
  //               example: '2022-04-29T19:21:00Z'
  //             tenant_id:
  //               type: integer
  //               example: 1
  //             updated_at:
  //               type: string
  //               format: date-time
  //               example: '2022-04-29T17:23:33.792Z'
  //             user_id:
  //               type: integer
  //               example: 1
  //             workinghour_period:
  //               type: string
  //               description: >-
  //                 occurs when receiving workinghour data from the server. is 'daily'
  //                 for anything timetracking related
  //               enum:
  //                 - daily
  //             workinghours:
  //               type: number
  //               description: tracked time in hours. Initially 0
  //               example: 0.016666666666666666
  //             workinghours_saldo_id:
  //               type: integer
  //               example: 29
  //

  async startTimetracking(req, reply) {
    try {
      const workinghours = this.db.collection("workinghours");
      const item = { ...req.params, _id: getNextSequenceValue("workinghours") };
      await workinghours.insertOne(item);
      reply.send({
        data: formatWorkinghourForResponse(item)
      });
    } catch (err) {
      reply.send(err);
    }
  }

  // Operation: stopTimetracking
  // URL: /workinghour_logs/users/:userId/workinghours/:workinghourId
  // summary:  stop timetracking
  // req.params
  //   type: object
  //   properties:
  //     userId:
  //       type: integer
  //       description: id of user for whom the time is tracked
  //     workinghourId:
  //       type: integer
  //       description: id of workinghour that will be updated
  //   required:
  //     - userId
  //     - workinghourId
  //
  // req.body
  //   required:
  //     - action
  //     - additional_params
  //     - end_date
  //     - log_type
  //   type: object
  //   properties:
  //     end_date:
  //       type: string
  //       description: the time the logging was started
  //       format: date-time
  //     action:
  //       type: string
  //       description: 'type of tracked time. ''work'' for worktime, ''pause'' for breaks '
  //       enum:
  //         - work
  //         - pause
  //     log_type:
  //       type: integer
  //       description: >-
  //         type of log action as number, use when sending workinghour data to the
  //         server. 1 when the timetracking ist started, 0 once the timetracking
  //         stopped
  //       enum:
  //         - 1
  //         - 0
  //     additional_params:
  //       required:
  //         - send_notification
  //         - start_calculation
  //       type: object
  //       properties:
  //         start_calculation:
  //           type: boolean
  //           description: calculate the logged time
  //           example: true
  //         send_notification:
  //           type: boolean
  //           description: notify responsible users that workinghours were logged
  //           example: true
  //       description: additional options for triggering serverside actions
  //
  // valid responses
  //   '200':
  //     description: ''
  //     content:
  //       application/json:
  //         schema:
  //           type: object
  //           properties:
  //             comment:
  //               type: string
  //             created_at:
  //               type: string
  //               format: date-time
  //               example: '2022-04-29T17:21:06.417Z'
  //             end_date:
  //               type: string
  //               format: date-time
  //               example: '2022-04-29T19:22:00Z'
  //             id:
  //               type: integer
  //               example: 1
  //             internal_creation:
  //               description: >-
  //                 describes how the workinghour was created. will be always 'true'
  //                 in our use case
  //               type: boolean
  //               example: true
  //             log_type:
  //               type: string
  //               description: >-
  //                 type of log action as string, occurs when receiving workinghour
  //                 data from the server. 'log' when the timetracking is started,
  //                 'entry' once the timetracking stopped
  //               enum:
  //                 - log
  //                 - entry
  //             project_id:
  //               type: integer
  //               example: 1
  //             resource_url:
  //               type: string
  //             start_date:
  //               type: string
  //               format: date-time
  //               example: '2022-04-29T19:21:00Z'
  //             tenant_id:
  //               type: integer
  //               example: 1
  //             updated_at:
  //               type: string
  //               format: date-time
  //               example: '2022-04-29T17:23:33.792Z'
  //             user_id:
  //               type: integer
  //               example: 1
  //             workinghour_period:
  //               type: string
  //               description: >-
  //                 occurs when receiving workinghour data from the server. is 'daily'
  //                 for anything timetracking related
  //               enum:
  //                 - daily
  //             workinghours:
  //               type: number
  //               description: tracked time in hours. Initially 0
  //               example: 0.016666666666666666
  //             workinghours_saldo_id:
  //               type: integer
  //               example: 29
  //

  async stopTimetracking(req, reply) {
    try {
      const workinghours = this.db.collection("workinghours");
      const item = { ...req.params, _id: getNextSequenceValue("workinghours") };
      const result = await workinghours.updateOne(
        { _id: req.params.workinghourId },
        item
      );
      console.log("=======>", result);
      reply.send({
        data: formatWorkinghourForResponse(item)
      });
    } catch (err) {
      reply.send(err);
    }
  }
}

module.exports = (opts) => new Service(opts);
