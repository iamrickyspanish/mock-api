const getNextSequenceValue = async (db, sequenceName) => {
  const counters = db.collection("counters");
  const sequenceDocument = await counters.findOneAndUpdate(
    { _id: sequenceName },
    { $inc: { sequence_value: 1 } },
    { returnNewDocument: true }
  );
  return sequenceDocument?.value?.sequence_value;
};

module.exports = {
  getNextSequenceValue
};
