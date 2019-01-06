/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var SAR = ee.Image("users/gowriuday/sultan_Stack"),
    sulthanb = ee.FeatureCollection("users/gowriuday/sultanbattery"),
    classified_vis = {"opacity":1,"bands":["classification"],"min":0,"max":6,"palette":["3ed613","f7f9a2","060cd6","8effc6","7a3d3d","255800","d63000"]},
    srtm = ee.Image("USGS/SRTMGL1_003"),
    fused_vh = ee.Image("users/balaji9th/sultan_vh_fused_ten"),
    fused_vv = ee.Image("users/balaji9th/sultan_vv_fused_ten");
/***** End of imports. If edited, may not auto-convert in the playground. *****/


//clip to extent
var all_bands = fused_vh.clip(sulthanb).rename(['B2','B3','B4','B8','B5','B6','B7','B8A','B11','B12']);
// Map.addLayer(all_bands, {bands: ['B8', 'B4', 'B3'], min: 363, max: 3176}, 'Kharifsr',0);
// print(Kharifsr,'Kharifsr');



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

var bands =all_bands.bandNames();
bands=ee.List(bands)

// print(all_bands,'all_bands');
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
