const splitService = require('../services/split.service');

async function createSplit(req, res) {
  try {
    const { targetType, targetId, parts, nicknames } = req.body;
    const data = await splitService.createSplit({
      organizerUserId: req.userId,
      targetType,
      targetId,
      parts,
      nicknames,
    });
    return res.status(201).json(data);
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message });
  }
}

async function getByToken(req, res) {
  try {
    const data = await splitService.getSplitByToken(req.params.token);
    return res.json(data);
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message });
  }
}

async function payShare(req, res) {
  try {
    const data = await splitService.payShare({ inviteToken: req.params.token, userId: req.userId });
    return res.json(data);
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message });
  }
}

async function mySplits(req, res) {
  try {
    const data = await splitService.mySplits(req.userId);
    return res.json({ data });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message });
  }
}

module.exports = { createSplit, getByToken, payShare, mySplits };
