/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var SAR = ee.Image("users/gowriuday/sultan_Stack"),
    sulthanb = ee.FeatureCollection("users/gowriuday/sultanbattery"),
    classified_vis = {"opacity":1,"bands":["classification"],"min":0,"max":6,"palette":["3ed613","f7f9a2","060cd6","8effc6","7a3d3d","255800","d63000"]},
    srtm = ee.Image("USGS/SRTMGL1_003"),
    polygon = /* color: #d63000 */ee.Geometry.MultiPoint();
/***** End of imports. If edited, may not auto-convert in the playground. *****/

function maskS2clouds(image) {
  var qa = image.select('QA60');

  // Bits 10 and 11 are clouds and cirrus, respectively.
  var cloudBitMask = 1 << 10;
  var cirrusBitMask = 1 << 11;

  // Both flags should be set to zero, indicating clear conditions.
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0).and(
            qa.bitwiseAnd(cirrusBitMask).eq(0));

  // Return the masked and scaled data, without the QA bands.
  return image.updateMask(mask).divide(1).toDouble()
      .select("B.*")
      .copyProperties(image, ["system:time_start"]);
}

// Map the function over one year of data and take the median.
// Load Sentinel-2 TOA reflectance data.
var Kharif = ee.ImageCollection('COPERNICUS/S2')
    .filterDate('2017-10-01', '2017-10-30')
    // Pre-filter to get less cloudy granules.
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 5))
    .map(maskS2clouds);

//clip to extent
var all_bands = Kharif.median().clipToCollection(sulthanb).select(['B2','B3','B4','B5','B6','B7','B8','B8A','B11','B12']);
Map.addLayer(all_bands, {bands: ['B8', 'B4', 'B3'], min: 363, max: 3176}, 'Kharifsr',0);
// print(Kharifsr,'Kharifsr');



//ground truth display
var GroundT = GT.filter(ee.Filter.gt('SubclassNa', 'rubber'));
// print(GroundT,'GroundT');
// Map.addLayer(GroundT,{},'GroundT');


//adding sar imgae
all_bands=all_bands.addBands(SAR.rename(['vh','vv','entropy','alpha','anistropy']).toDouble());


//adding ndvi
all_bands = all_bands.addBands(all_bands.normalizedDifference(['B8','B4']).rename('ndvi').toDouble());


//adding srtm elevation
all_bands=all_bands.addBands(srtm.clip(sulthanb).toDouble());

//adding glcm 
var glcm_bands=['B2','B3','B4','B5','B6','B7','B8','B8A','B11','B12'];
var out_glcm_bands=glcm_bands.map(function(item){return item+'_savg';})
var glcm = all_bands.select(glcm_bands).toInt32().glcmTexture({size: 4}); //computing glcm
all_bands=all_bands.addBands(glcm.select(out_glcm_bands))
// print(glcm ,'glcm');
// Map.addLayer(glcm,{},'glcm',0)



//bands considered for calssification
var bands =['B2','B3','B4','B5','B6','B7','B8','B8A','B11','B12'];
bands=bands.concat(out_glcm_bands);
//var bands =all_bands.bandNames();
bands =["B2","B3","B4","B5","B6","B7","B8","B8A","B11","B12","vh","vv","entropy","alpha","anistropy","ndvi","elevation","B2_savg","B3_savg","B4_savg","B5_savg","B6_savg","B7_savg","B8_savg","B8A_savg","B11_savg","B12_savg"];
//bands =["B2","B3","B4","B5","B6","B7","vh","vv","ndvi","elevation","B2_savg","B3_savg","B4_savg","B5_savg","B6_savg","B7_savg"];
bands=ee.List(bands)

print(all_bands,'all_bands');
print(bands,'bands considered');
// Map.addLayer(all_bands,{},'all_bands',0);

//--------------ImageNormalisation-------------------------------------------
var min_value = all_bands.select(bands).reduceRegion({
          reducer: ee.Reducer.min(),
          geometry:sulthanb,
          scale:10,
          maxPixels:1e18
          });

var max_value = all_bands.select(bands).reduceRegion({
          reducer: ee.Reducer.max(),
          geometry:sulthanb,
          scale:10,
          maxPixels:1e18
          });

var normalised=ee.Image();
normalised=bands.iterate(function(n,normalised){
  normalised=ee.Image(normalised);
  var range=ee.Number(max_value.get(n)).subtract(ee.Number(min_value.get(n)));
  var nor=all_bands.select(ee.List([n])).subtract(ee.Number(min_value.get(n))).divide(range);
  normalised=normalised.addBands(nor);
  return normalised;
},normalised);
normalised=ee.Image(normalised).select(bands);
Export.image.toAsset({
  image:normalised,
  region:sulthanb,
  scale:10,
  maxPixels:1e13
})

// print(ee.Image(normalised))

// for(var i=0;i<bands.length;i=i+1){
//   if(i===0){
//     var min=ee.Image.constant(ee.Number(min_value.get(bands[i]))).rename(bands[i]).clip(sulthanb)
//     var max=ee.Image.constant(ee.Number(min_value.get(bands[i]))).rename(bands[i]).clip(sulthanb)
//   }
//   else{
//     min=min.addBands(ee.Image.constant(ee.Number(min_value.get(bands[i]))).rename(bands[i]))
//     max=max.addBands(ee.Image.constant(ee.Number(max_value.get(bands[i]))).rename(bands[i]))
//   }
// }


// min=min.clip(sulthanb);max=max.clip(sulthanb);

// var range = max.subtract(min);
// var up_min = all_bands.select(bands).subtract(min);
// var normalised = up_min.divide(range).clip(sulthanb);

// Map.addLayer(normalised,{},'normalised');
// print(normalised,"normalized");
// // ////-------------- End of ImageNormalisation-------------------------------------------



// Sampling and taking training samples
// var points = Paddy
//             .merge(WaterBody)
//             .merge(Forest)
//             .merge(Builtup)
//             .merge(Rubber)
//             .merge(Coconut)
//             .merge(Barrenland);
// // print(points,'points');

// var training = all_bands.sampleRegions({
//   collection: points,
//   properties: ['LULC'],
//   scale: 50
// });
// // print(training,'training');


// //splicting into train and test samples
// var withRandom = training.randomColumn('random');
// var split = 0.7;  // Roughly 70% training, 30% testing.
// var trainingPartition = withRandom.filter(ee.Filter.lt('random', split));
// var testingPartition = withRandom.filter(ee.Filter.gte('random', split));


// // classifier defining
// var classifier = ee.Classifier.svm({
//   kernelType: 'RBF',
//   gamma: 3.5,
//   cost: 20
// });

// // Training the classifier.
// var trained_classifier = classifier.train(trainingPartition, 'LULC', bands);

// // Classify the image.
// var classified = all_bands.classify(trained_classifier);
// Map.addLayer(classified,classified_vis ,'classified');
  
  
// // printing training results
// var trainAccuracy = trained_classifier.confusionMatrix();
// print('Resubstitution error matrix: ', trainAccuracy);
// print('Training overall accuracy: ', trainAccuracy.accuracy());

// Export.image.toDrive({
//   image: ndvi,
//   description: 'Ndvi',
//   scale: 10,
//   region: sulthanb
// });

// var ras=points.reduceToImage(["LULC"],ee.Reducer.median()).remap([1,2,3,4,5,6,7],[1,2,3,4,5,6,7]);
// Export.table.toDrive({
//   collection: points,
//   description:'traingkml',
//   fileFormat: 'KML'
// });



// // Classify the test FeatureCollection.
// print("-----Results for Testing Partition----");
// var test = testingPartition.classify(trained_classifier);
// // print(testingPartition)

// // Print the confusion matrix.
// var confusionMatrix = test.errorMatrix('LULC', 'classification');
// print('Confusion Matrix', confusionMatrix);
// print('Accuracy', confusionMatrix.accuracy());