const { namespaceWrapper } = require('../_koiiNode/koiiNode');
const tf = require('@tensorflow/tfjs-node');
global.fetch = require('node-fetch');
const mobilenet = require('@tensorflow-models/mobilenet');
const fs = require('fs');
const path = require('path');

class Submission {
  /**
   * Executes your task, optionally storing the result.
   *
   * @param {number} round - The current round number
   * @returns {void}
   */

  async task(round) {
    try {
      console.log('ROUND', round);
      // const { modelJson, accuracy } = await this.trainModel();
      // console.log('Trained Model JSON:', modelJson);
      // console.log('Training Accuracy:', accuracy);
      const {newmodel,newmodel_as_string,accuracy} = await this.trainModel();
      if (accuracy) {
        await namespaceWrapper.storeSet('accuracy', accuracy);
      }
      return accuracy;
    } catch (err) {
      console.log('ERROR IN EXECUTING TASK', err);
      return 'ERROR IN EXECUTING TASK' + err;
    }
  }


  async saveJsonToFile(jsonString, filePath) {
    try {
        await fs.writeFile(filePath, jsonString, 'utf8');
        console.log('JSON file has been saved.');
    } catch (err) {
        console.log('An error occurred while writing JSON to file.');
        console.error(err);
    }
}

async modifyModelForNewTask(originalModel) {
  const numClasses = 3; // Change this to the number of classes for your specific task

  // Assume the last layer of the original model is not suitable and should be replaced
  originalModel.layers.pop(); // This removes the last layer
  
  // Add new layers
  const newOutputLayer = tf.layers.dense({
    units: numClasses,
    activation: 'softmax',
    inputShape: originalModel.outputs[0].shape.slice(1)
  });

  const newModel = tf.model({
    inputs: originalModel.inputs,
    outputs: newOutputLayer.apply(originalModel.outputs[0])
  });

  newModel.compile({
    optimizer: 'adam',
    loss: 'sparseCategoricalCrossentropy',
    metrics: ['accuracy']
  });

  return newModel;
}

async trainModel() {
  let modelInfo = { modelJson: '', accuracy: 0 };
  try {
    const model = await this.loadTFJSModel(); // Load the pre-trained model
    const modifiedModel = await this.modifyModelForNewTask(model); // Modify the model if necessary

    const metadata = await this.loadMetadata(); // Load metadata for accessing the dataset
    const { images, labels } = await this.loadImages(metadata); // Load the dataset

    console.log("Starting training...");
    await modifiedModel.fit(images, labels, {
      epochs: 10,
      batchSize: 32,
      validationSplit: 0.2
    });
    console.log("Training complete.");

    // Evaluate the model
    const evalResult = await modifiedModel.evaluate(images, labels);
    const accuracy = evalResult[1].dataSync()[0]; // Assuming the second return value is accuracy
    console.log('Model Accuracy:', accuracy);

    // Serialize the model to a JSON string
    const modelJson = modifiedModel.toJSON();
    const modelAsString = JSON.stringify(modelJson);
    console.log('Serialized Model:', modelAsString);
    
    // Save the trained model (optional)
    // await modifiedModel.save(`file://${__dirname}/updated_model`);

    modelInfo.modelJson = modelAsString;
    modelInfo.accuracy = accuracy;
    //return modifiedModel;
    return { model: modifiedModel, modelAsString: modelAsString, accuracy: accuracy };
  } catch (error) {
    console.error('Error during training:', error);
    return { model: null, modelAsString: '', accuracy: 0 };
  }
  
}


async checkModelDirectory(modelDir) {
  try {
      // Check if directory exists and read files
      if (fs.existsSync(modelDir)) {
          const files = await fs.promises.readdir(modelDir);

          // Check for 'model.json' and at least one weight file
          const modelFileExists = files.includes('model.json');
          const weightFilesExist = files.some(file => file.startsWith('group1-shard') && file.endsWith('.bin'));

          return modelFileExists && weightFilesExist ? 1 : 0;
      } else {
          return 0;
      }
  } catch (error) {
      console.error('Error checking model directory:', error);
      return 0;  // Consider non-existence in case of error
  }
}

async loadTFJSModel() {
  //const localModelPath = `${__dirname}/model/model.json`;
  const localModelPath = path.join(__dirname, 'model', 'model.json');
  const modelDir = `${__dirname}/model`;

  // Use the comprehensive check for model and weights
  const modelExists = await this.checkModelDirectory(modelDir);

  if (modelExists) {
      console.log("Model found locally. Loading...");
      return tf.loadLayersModel(`file://${localModelPath}`);
  } else {
      console.log("Model not found locally. Downloading...");
      return this.downloadAndSaveModel('https://github.com/eviangel/Koiivision/raw/main/model/', localModelPath);
  }
}

async downloadAndSaveModel(baseUrl, savePath) {
  try {
    const modelUrl = baseUrl + 'model.json';
    const response = await fetch(modelUrl);
    if (!response.ok) throw new Error('Failed to download the model JSON');

    const modelJson = await response.json();
    console.log(savePath);
    const dir = path.dirname(savePath);
    await fs.promises.mkdir(dir, { recursive: true });

    await fs.promises.writeFile(savePath, JSON.stringify(modelJson), 'utf8');
    console.log('Model JSON downloaded and saved.');

    // Download each shard of the model weights
    const numShards = 37; // total number of weight shards
    
    for (let i = 1; i <= numShards; i++) {
      const shardUrl = `${baseUrl}group1-shard${i}of${numShards}.bin`;
      console.log(shardUrl);
      const shardResponse = await fetch(shardUrl);
      if (!shardResponse.ok) throw new Error(`Failed to download shard ${i}`);
      
      const shardBuffer = await shardResponse.buffer();
      await fs.promises.writeFile(`${__dirname}/model/group1-shard${i}of${numShards}.bin`, shardBuffer);
      console.log(`Shard ${i} downloaded and saved.`);
    }

    // After downloading, load the model from the local path
    return tf.loadLayersModel(`file://${savePath}`);
  } catch (error) {
    console.error('Error during model download and setup:', error);
    throw error;
  }
}

async predictWithModel() {
  try {
    const model = await this.loadTFJSModel();
    // Assuming you have some input tensor `inputTensor`
    const inputTensor = tf.tensor([/* your tensor data here */]);
    const predictions = model.predict(inputTensor);
    console.log('Predictions:', predictions);
    return predictions;
  } catch (error) {
    console.error('Failed to make predictions:', error);
    throw error;
  }
}


async saveModelAsString(filePath,model) {
  const modelJson = model.toJSON();
  const modelJsonStr = JSON.stringify(modelJson);

  const weights = model.getWeights();
  const weightsBase64 = weights.map(tensor => {
      const buffer = tensor.dataSync(); // Getting data synchronously
      const base64String = Buffer.from(buffer).toString('base64');
      return base64String;
  });

  const combinedModelStr = JSON.stringify({
      modelJsonStr: modelJsonStr,
      weightsBase64: weightsBase64
  });
  await fs.writeFile(filePath, combinedModelStr, 'utf8');

  return combinedModelStr;
}



async loadMetadata() {
    const metadataUrl = 'https://github.com/eviangel/Koiivision/raw/main/dataset/metadata.csv';
    const response = await fetch(metadataUrl);
    if (!response.ok) throw new Error('Network response was not ok');
    const text = await response.text(); // Only consume the body once
    return text.split('\n').slice(1,-1).map(line => {
        const [lesion_id, image_id, dx, dx_type, age, sex, localization] = line.split(',');
        if(image_id != undefined){
        console.log(image_id);
          return { lesion_id, image_id, dx, dx_type, age, sex, localization };}
    });
}


async loadImages(metadata) {
  const images = [];
  const labels = [];

  for (const { image_id, dx } of metadata) {
      const imageUrl = `https://github.com/eviangel/Koiivision/raw/main/dataset/${image_id}.jpg`;
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
          throw new Error(`Failed to fetch ${imageUrl}: ${imageResponse.statusText}`);
      }
      const imageBuffer = await imageResponse.buffer();
      //console.log('Image Buffer:', imageBuffer);
      const tensorImage = tf.node.decodeImage(imageBuffer, 3)
          .resizeNearestNeighbor([224, 224])
          .toFloat()
          .div(tf.scalar(255))
          .expandDims();
      images.push(tensorImage);
      labels.push(dx === 'bkl' ? 1 : 0); // Example for binary classification

      
  }
// Stack the images into a single tensor and reshape
const imagesTensor = tf.concat(images); // Stack along the batch dimension
const labelsTensor = tf.tensor1d(labels, 'float32');

return { images: imagesTensor, labels: labelsTensor };
}





  
  /**
   * Submits a task for a given round
   *
   * @param {number} round - The current round number
   * @returns {Promise<any>} The submission value that you will use in audit. Ex. cid of the IPFS file
   */
  async submitTask(round) {
    console.log('SUBMIT TASK CALLED ROUND NUMBER', round);
    try {
      console.log('SUBMIT TASK SLOT',await namespaceWrapper.getSlot());
      const submission = await this.fetchSubmission(round);
      console.log('SUBMISSION', submission);
      await namespaceWrapper.checkSubmissionAndUpdateRound(
        submission,
        round,
      );
      console.log('SUBMISSION CHECKED AND ROUND UPDATED');
      return submission;
    } catch (error) {
      console.log('ERROR IN SUBMISSION', error);
    }
  }
  /**
   * Fetches the submission value 
   *
   * @param {number} round - The current round number
   * @returns {Promise<string>} The submission accuracy that you will use in audit. It is the model accuracy.
   *
   */
  async fetchSubmission(round) {
    console.log('FETCH SUBMISSION');
    // Fetch the value from NeDB
    const value = await namespaceWrapper.storeGet('accuracy'); // retrieves the value
    // Return cid/value, etc.
    return value;
  }
}
const submission = new Submission();
module.exports = { submission };
