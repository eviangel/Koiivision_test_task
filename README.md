# Koiivision_test_task

## Overview
This Task integrates machine learning with blockchain technologies, specifically focusing on training, evaluating, and managing TensorFlow.js models. It supports tasks related to image processing, leveraging a pre-trained MobileNet model and adapting it for new tasks by modifying its final layers. Additionally, the application interacts with blockchain through the Koii network, facilitating the storage and retrieval of model accuracies and other related metrics.

## Features
### Machine Learning Model Operations
Model Training and Evaluation: Trains a TensorFlow.js model using provided metadata and image datasets, evaluates its accuracy, and handles the serialization of the trained model.
Model Modification: Adapts a pre-trained model to new tasks by modifying its output layers to match the number of target classes.
Model Persistence: Checks for the existence of model files locally before loading; downloads and saves them if not present.
##Blockchain Integration
Utilizes the Koii network to manage tasks related to model training rounds, storing model accuracy in a blockchain ledger, ensuring integrity and traceability of model performance data.
