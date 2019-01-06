/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var unfused_all = ee.Image("users/balaji9th/unfused_all"),
    sulthanb = ee.FeatureCollection("users/gowriuday/sultanbattery"),
    classified_vis = {"opacity":1,"bands":["classification"],"min":0,"max":6,"palette":["3ed613","f7f9a2","060cd6","8effc6","7a3d3d","255800","d63000"]},
    fused_vv = ee.Image("users/balaji9th/fused_vv_all"),
    fused_vh = ee.Image("users/balaji9th/fused_vh_all"),
    classified_vi = {"opacity":1,"bands":["classification"],"min":0,"max":6,"palette":["0df11e","0523f9","2a9d43","ff0000","b1ff36","00fff3","fffb8f"]},
    imageVisParam = {"opacity":1,"bands":["B8","B4","B3"],"min":0.027320123155098762,"max":0.5157447511968216,"gamma":1};
/***** End of imports. If edited, may not auto-convert in the playground. *****/
//UI preparation 
    // Make another map and add a color-NIR composite to it.
    var linkedMap = ui.Map();
    
    // Link the default Map to the other map.
    var linker = ui.Map.Linker([ui.root.widgets().get(0), linkedMap]);
    
    // Create a SplitPanel which holds the linked maps side-by-side.
    var splitPanel = ui.SplitPanel({
      firstPanel: linker.get(0),
      secondPanel: linker.get(1),
      orientation: 'horizontal',
      wipe: true,
      style: {stretch: 'both'}
    });
    
    // Set the SplitPanel as the only thing in root.
    ui.root.widgets().reset([splitPanel]);
    linkedMap.centerObject(sulthanb,12)
///////////////////////////////////////////

var train_import=require('users/gowriuday/sultanbathery:train_samples_sultan')

var all_bands=fused_vh.clip(sulthanb);

//replace bands 2,3,4,8 with orginal
// all_bands=all_bands.addBands(unfused_all.select(["B2","B3","B4","B8"]),["B2","B3","B4","B8"],true);

Map.addLayer(all_bands,imageVisParam,'all bands');
// print(all_bands,'all bands');


// var bands=all_bands.bandNames();
var bands=["B2","B3","B4","B5","B6","B7","B8","B8A","B11","B12"];
          bands=bands.concat(["ndvi","elevation","B2_savg","B3_savg","B4_savg","B5_savg","B6_savg","B7_savg","B8_savg","B8A_savg","B11_savg","B12_savg"]);
          bands=bands.concat(["vh","vv"]);
          bands=bands.concat(["entropy","alpha","anistropy"]);
          
all_bands=all_bands.select(bands);
print(bands,"Considered bands");


//taking training samples
var training = train_import.get_training_samples();
var testing = train_import.get_testing_samples();
// print(points,'points');

training = all_bands.sampleRegions({
  collection: training,
  properties: ['LULC'],
  scale: 10
});


// taking only training part
// var keys=ee.Dictionary(training.aggregate_histogram('LULC')).keys()
// var split=0.6;
// var seed=1;//ee.Number(Math.random()*100).toLong();
// var training=keys.iterate(function(index,dict){
//   var withRandom=training.filter(ee.Filter.eq('LULC',ee.Number.parse(index))).randomColumn('random',seed);
//   var trainingPartition=withRandom.filter(ee.Filter.lt('random', split));
//   return ee.Algorithms.If(dict,trainingPartition.merge(ee.FeatureCollection(dict)),trainingPartition);
  
// },'');

testing = all_bands.sampleRegions({
  collection: testing,
  properties: ['LULC'],
  scale: 10
});
// print(training)
print(ee.FeatureCollection(training).aggregate_histogram('LULC'))
print(ee.FeatureCollection(testing).aggregate_histogram('LULC'))


// classifier defining
// var classifier = ee.Classifier.svm({
//   kernelType: 'RBF',
//   gamma: 3.5,
//   cost: 56
// });

var classifier= ee.Classifier.randomForest({numberOfTrees:54});
// var classifier = ee.Classifier.cart();

// Training the classifier.
var trained_classifier = classifier.train(training, 'LULC',bands);

//Classify the image.
var classified = all_bands.classify(trained_classifier);
linkedMap.addLayer(classified,classified_vi ,'classified');
  
  
// //printing training results
// var trainAccuracy = trained_classifier.confusionMatrix();
// print('Resubstitution error matrix: ', trainAccuracy);
// print('Training overall accuracy: ', trainAccuracy.accuracy());


// Classify the test FeatureCollection.
var test = testing.classify(trained_classifier);
// print(testingPartition)

// Print the confusion matrix.
var confusionMatrix = test.errorMatrix('LULC', 'classification');
print('Confusion Matrix',confusionMatrix );
print('Testing Accuracy', confusionMatrix.accuracy());
print('ProducersAccuracy',confusionMatrix.producersAccuracy());
print('ConsumersAccuracy',confusionMatrix.consumersAccuracy());
