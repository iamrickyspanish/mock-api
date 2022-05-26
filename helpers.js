const getNextSequenceValue = async (db, sequenceName) => {
  const counters = db.collection("counters");
  const sequenceDocument = await counters.findOneAndUpdate(
    { _id: sequenceName },
    { $inc: { sequence_value: 1 } },
    { returnNewDocument: true }
  );
  return sequenceDocument?.value?.sequence_value;
};

const formatWorkinghourForResponse = (workinghour, short = false) => {
  const { _id, ...rest } = workinghour;
  delete rest.additional_params;
  const preparedWorkinghour = {
    ...rest,
    log_type: rest.log_type ? "log" : "entry",
    workinghour_period: "daily",
    id: Number(workinghour.id || _id)
  };
  return short
    ? (() => {
        const { start_date, end_date, id, project_name, action, log_type } =
          preparedWorkinghour;
        return { start_date, end_date, id, project_name, action, log_type };
      })()
    : preparedWorkinghour;
};

const createWorkinghour = async (db, data) => {
  const nextId = await getNextSequenceValue(db, "workinghourId");
  const createdAt = new Date();
  const workinghours = db.collection("workinghours");

  const item = {
    ...data,
    _id: nextId,
    comment: null,
    created_at: createdAt,
    internal_creation: true,
    workinghour_period: 0,
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

module.exports = {
  getNextSequenceValue,
  formatWorkinghourForResponse,
  createWorkinghour
};
