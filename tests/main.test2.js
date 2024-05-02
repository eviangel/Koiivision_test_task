const { Submission } = require('../task/submission'); // Assuming Submission class is in 'submission.js'
const { namespaceWrapper, _server } = require('../_koiiNode/koiiNode');
const Joi = require('joi');
const axios = require('axios');

beforeAll(async () => {
  await namespaceWrapper.defaultTaskSetup();
});

describe('Performing the task', () => {
  it('should perform the core logic task', async () => {
    const submission = new Submission();
    const round = 1;
    const result = await submission.task(round);
    expect(result).not.toContain('ERROR IN EXECUTING TASK');
  });

  it('should make the submission for dummy round 1', async () => {
    const submission = new Submission();
    const round = 1;
    await submission.submitTask(round);
    const taskState = await namespaceWrapper.getTaskState();
    const schema = Joi.object()
      .pattern(
        Joi.string(),
        Joi.object().pattern(
          Joi.string(),
          Joi.object({
            submission_value: Joi.string().required(),
            slot: Joi.number().integer().required(),
            round: Joi.number().integer().required(),
          }),
        ),
      )
      .required()
      .min(1);
    const validationResult = schema.validate(taskState.submissions);
    try {
      expect(validationResult.error).toBeUndefined();
    } catch (e) {
      throw new Error("Submission doesn't exist or is incorrect");
    }
  });

  it('should audit the submission', async () => {
    const submission = new Submission();
    const round = 1;
    await submission.auditTask(round);
    const taskState = await namespaceWrapper.getTaskState();
    const schema = Joi.object()
      .pattern(
        Joi.string(),
        Joi.object().pattern(
          Joi.string(),
          Joi.object({
            trigger_by: Joi.string().required(),
            slot: Joi.number().integer().required(),
            votes: Joi.array().required(),
          }),
        ),
      )
      .required();
    const validationResult = schema.validate(taskState.submissions_audit_trigger);
    try {
      expect(validationResult.error).toBeUndefined();
    } catch (e) {
      throw new Error('Submission audit is incorrect');
    }
  });

  it('should handle the distribution submission for dummy round 1', async () => {
    const submission = new Submission();
    const round = 1;
    await submission.submitDistributionList(round);
    const taskState = await namespaceWrapper.getTaskState();
    const schema = Joi.object()
      .pattern(
        Joi.string(),
        Joi.object().pattern(
          Joi.string(),
          Joi.object({
            submission_value: Joi.string().required(),
            slot: Joi.number().integer().required(),
            round: Joi.number().integer().required(),
          }),
        ),
      )
      .required()
      .min(1);
    const validationResult = schema.validate(taskState.distribution_rewards_submission);
    try {
      expect(validationResult.error).toBeUndefined();
    } catch (e) {
      throw new Error("Distribution submission doesn't exist or is incorrect");
    }
  });

  it('should audit the distribution submission', async () => {
    const submission = new Submission();
    const round = 1;
    await submission.auditDistribution(round);
    const taskState = await namespaceWrapper.getTaskState();
    const schema = Joi.object()
      .pattern(
        Joi.string(),
        Joi.object().pattern(
          Joi.string(),
          Joi.object({
            trigger_by: Joi.string().required(),
            slot: Joi.number().integer().required(),
            votes: Joi.array().required(),
          }),
        ),
      )
      .required();
    const validationResult = schema.validate(taskState.distributions_audit_trigger);
    try {
      expect(validationResult.error).toBeUndefined();
    } catch (e) {
      throw new Error('Distribution audit is incorrect');
    }
  });

  it('should ensure the submitted distribution list is valid', async () => {
    const submission = new Submission();
    const round = 1;
    const distributionList = await namespaceWrapper.getDistributionList(null, round);
    const schema = Joi.object()
      .pattern(Joi.string().required(), Joi.number().integer().required())
      .required();
    const validationResult = schema.validate(JSON.parse(distributionList.toString()));
    try {
      expect(validationResult.error).toBeUndefined();
    } catch (e) {
      throw new Error('Submitted distribution list is not valid');
    }
  });

  it('should test the endpoint', async () => {
    const response = await axios.get('http://localhost:10000');
    expect(response.status).toBe(200);
    expect(response.data).toEqual('Hello World!');
  });
});

afterAll(async () => {
  _server.close();
});
