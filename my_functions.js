// //UI preparation 
//     // Make another map and add a color-NIR composite to it.
//     var linkedMap = ui.Map();
    
//     // Link the default Map to the other map.
//     var linker = ui.Map.Linker([ui.root.widgets().get(0), linkedMap]);
    
//     // Create a SplitPanel which holds the linked maps side-by-side.
//     var splitPanel = ui.SplitPanel({
//       firstPanel: linker.get(0),
//       secondPanel: linker.get(1),
//       orientation: 'horizontal',
//       wipe: true,
//       style: {stretch: 'both'}
//     });
    
//     // Set the SplitPanel as the only thing in root.
//     // ui.root.widgets().reset([splitPanel]);
// ///////////////////////////////////////////
//end of ui preparation

//function for masking clouds from sentinel 2 image
exports.maskS2clouds = function (image) {
  var qa = image.select('QA60');

  // Bits 10 and 11 are clouds and cirrus, respectively.
  var cloudBitMask = 1 << 10;
  var cirrusBitMask = 1 << 11;

  // Both flags should be set to zero, indicating clear conditions.
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0).and(
            qa.bitwiseAnd(cirrusBitMask).eq(0));

  // Return the masked and scaled data, without the QA bands.
  return image.updateMask(mask).divide(1)
      .select("B.*")
      .copyProperties(image, ["system:time_start"]);
}


