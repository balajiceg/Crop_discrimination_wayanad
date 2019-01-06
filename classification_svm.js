/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var unfused_all = ee.Image("users/balaji9th/unfused_all"),
    sulthanb = ee.FeatureCollection("users/gowriuday/sultanbattery"),
    classified_vis = {"opacity":1,"bands":["classification"],"min":0,"max":6,"palette":["3ed613","f7f9a2","060cd6","8effc6","7a3d3d","255800","d63000"]},
    fused_vv = ee.Image("users/balaji9th/fused_vv_all"),
    fused_vh = ee.Image("users/balaji9th/fused_vh_all");
/***** End of imports. If edited, may not auto-convert in the playground. *****/
var train_import=require('users/gowriuday/sultanbathery:train_samples_sultan')

var all_bands=unfused_all.clip(sulthanb);

//replace bands 2,3,4,8 with orginal
// all_bands=all_bands.addBands(unfused_all.select(["B2","B3","B4","B8"]),["B2","B3","B4","B8"],true);

Map.addLayer(all_bands,{min:0,max:0.9,bands:["B8","B4","B3"]},'all bands',0);
// print(all_bands,'all bands');


// var bands=all_bands.bandNames();
var bands=[];//"B2","B3","B4","B5","B6","B7","B8","B8A","B11","B12"];
          // bands=bands.concat(["ndvi","elevation","B2_savg","B3_savg","B4_savg","B5_savg","B6_savg","B7_savg","B8_savg","B8A_savg","B11_savg","B12_savg"]);
          bands=bands.concat(["vh","vv"]);
          bands=bands.concat(["entropy","alpha","anistropy"]);
          
all_bands=all_bands.select(bands);
print(bands,"Considered bands");


//taking training samples
var points = train_import.get_training_samples();
// print(points,'points');

var training = all_bands.sampleRegions({
  collection: points,
  properties: ['LULC'],
  scale: 10
});
// print(training)

//stratified random sampling
var keys=ee.Dictionary(training.aggregate_histogram('LULC')).keys()
var split=0.6;
var seed=10;//ee.Number(Math.random()*100).toLong();
var trainingPartition=keys.iterate(function(index,dict){
  var withRandom=training.filter(ee.Filter.eq('LULC',ee.Number.parse(index))).randomColumn('random',seed);
  var trainingPartition=withRandom.filter(ee.Filter.lt('random', split));
  return ee.Algorithms.If(dict,trainingPartition.merge(ee.FeatureCollection(dict)),trainingPartition);
  
},'');

var testingPartition=keys.iterate(function(index,dict){
  var withRandom=training.filter(ee.Filter.eq('LULC',ee.Number.parse(index))).randomColumn('random',seed);
  var testingPartition=withRandom.filter(ee.Filter.gte('random', split));
  return ee.Algorithms.If(dict,testingPartition.merge(ee.FeatureCollection(dict)),testingPartition);
},'');
trainingPartition=ee.FeatureCollection(trainingPartition);
testingPartition=ee.FeatureCollection(testingPartition);
// print(ee.FeatureCollection(trainingPartition).aggregate_histogram('LULC'))
// print(ee.FeatureCollection(testingPartition).aggregate_histogram('LULC'))

for(var gamma=80;gamma<=85;gamma=gamma+0.5)
  for(var cost=900;cost<=1000;cost=cost+5){
    // classifier defining
    var classifier = ee.Classifier.svm({
      kernelType: 'RBF',
      gamma: gamma,
      cost: cost
    });
    // var classifier = ee.Classifier.cart();
    
    // Training the classifier.
    var trained_classifier = classifier.train(trainingPartition, 'LULC',bands);
    
    // Classify the image.
    //var classified = all_bands.classify(trained_classifier);
    // Map.addLayer(classified,classified_vis ,'classified');
      
      
    // printing training results
    // var trainAccuracy = trained_classifier.confusionMatrix();
    // print('Resubstitution error matrix: ', trainAccuracy);
    // print('Training overall accuracy: ', trainAccuracy.accuracy());
    
    
    
    // Classify the test FeatureCollection.
    var test = testingPartition.classify(trained_classifier);
    // print(testingPartition)
    
    // Print the confusion matrix.
    var confusionMatrix = test.errorMatrix('LULC', 'classification');
    //print('Confusion Matrix',confusionMatrix );
    // print('Testing Accuracy', confusionMatrix.accuracy());
    print("<<<<< gamma= "+gamma+" Cost:"+cost+" >>>>>",confusionMatrix.accuracy());
    // print("<<<<<<<<<<--->>>>>>>>>")
  }
  
  