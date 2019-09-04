/**
 * @OnlyCurrentDoc
 *
 * The above comment directs Apps Script to limit the scope of file
 * access for this add-on. It specifies that this add-on will only
 * attempt to read or modify the files in which the add-on is used,
 * and not all of the user's files. The authorization request message
 * presented to users will reflect this limited scope.
 */

/**
 * Creates a menu entry in the Google Docs UI when the document is opened.
 * This method is only used by the regular add-on, and is never called by
 * the mobile add-on version.
 *
 * @param {object} e The event parameter for a simple onOpen trigger. To
 *     determine which authorization mode (ScriptApp.AuthMode) the trigger is
 *     running in, inspect e.authMode.
 */

//GLOBALS (do not persist between calls to Google's servers)
numChars = 0

function onOpen(e) {
  DocumentApp.getUi().createAddonMenu()
      .addItem('Start', 'showSidebar')
      .addToUi();
}

/**
 * Runs when the add-on is installed.
 * This method is only used by the regular add-on, and is never called by
 * the mobile add-on version.
 *
 * @param {object} e The event parameter for a simple onInstall trigger. To
 *     determine which authorization mode (ScriptApp.AuthMode) the trigger is
 *     running in, inspect e.authMode. (In practice, onInstall triggers always
 *     run in AuthMode.FULL, but onOpen triggers may be AuthMode.LIMITED or
 *     AuthMode.NONE.)
 */
function onInstall(e) {
  onOpen(e);
}

function addDataInFirebase(docName, selection_start, selection_finish, selection_color, timestamp, snapCondition) {
  Logger.log(timestamp);
  //The following variables are necessary for firebase to recognize the add-on
  //This forms the connection to send and receive data to the database
  var baseUrl = "";
  var secret = "";
  var database = FirebaseApp.getDatabaseByUrl(baseUrl, secret);
  
  //selection color needs to be sent as string, so convert null to 'null'
  if(selection_color == null){
    selection_color = 'null';
  }

  //if the document doesn't exist in the database, the code in this if-statement will add the entry
  //the entry into the database will have its current length (number of total characters) added as a sub-entry
  if(database.getData(docName)==null)
  {
    Logger.log('database null check');
    var docLengthVar = {"Current_DocLength" : docLength()};
    Logger.log(database.setData(docName, docLengthVar)); //command that sets the entry in the database
    Logger.log('null check 2');
  }
  else
  {
    //if the entry does exist in the database, this call will just update the amount of characters in the document in case it has changed
    var docLen = {"Current_DocLength" : docLength()}; 
    Logger.log(database.updateData(docName, docLen));//command to update data that exists in the database
  }
  
  Logger.log('database statsLogger check');
  //This is the conditional which triggers the snapshot of the current doc
  if(snapCondition){
    statsLogger(true);
  }
  else
  {
    //This data variable is the actual data being stored in the database
    //It is paired to a timestamp, then pushed to the database
    var data = {"SelectedRange" : [selection_start, selection_finish], "SelectionColor" : selection_color, "VisualizationData" : [selection_finish-selection_start,selection_color]};
    Logger.log(database.pushData(docName+"/"+String(timestamp), data));//command to push data to an existing entry
  }
}

function getVisualizationData(docName)
{
  var baseUrl = "";
  var secret = "";
  var database = FirebaseApp.getDatabaseByUrl(baseUrl, secret);
  var data = base.getData(docName, "VisualizationData");
  Logger.log(data);
  return data;
}

/**
 * Opens a sidebar in the document containing the add-on's user interface.
 * This method is only used by the regular add-on, and is never called by
 * the mobile add-on version.
 */
function showSidebar() {
  var ui = HtmlService.createHtmlOutputFromFile('highlight')

      .setTitle('Highlighter');
  
  DocumentApp.getUi().showSidebar(ui);
  
  var htmlOutput = HtmlService
    .createHtmlOutput("<ol style='font-family: Arial, sans-serif;' type='1'><li>To highlight, select the text by left-clicking and dragging the cursor over the desired sentences. Next, click on the appropriate <strong>Highlight</strong> button on the right-hand toolbar (Summary/Yellow, Commentary/Blue, Evidence/Green). If you have done this correctly, the text in your essay should now be highlighted with the color that you selected.<br/><br/></li> <li>If you make a mistake, you can select the desired text and click <strong>Un-highlight</strong> on the toolbar. This will remove all highlighting from the selected text.<br/><br/></li> <li>Once you are done highlighting the text in your essay, you can look at the statistics (stats) displayed beside each highlight button. The stats will tell you what percentage of your writing is Summary, Commentary, Evidence, or Unmarked. You can use this information to help you decide if you need to add, cut, or revise parts of your essay.<br/><br/></li> <li>If you highlight text without using the buttons in the toolbar or add/remove text from the essay, this may confuse the add-on and produce incorrect stats. Immediately click the <strong>Update Stats</strong> button to fix this.</li></ol><input type='button' value='Close' onclick='google.script.host.close()' />")
  .setWidth(500)
    .setHeight(200);
  DocumentApp.getUi().showModalDialog(htmlOutput, 'Instructions');
}

//Used exclusively by Instructions button
function displayInstructions() {
  var htmlOutput = HtmlService
    .createHtmlOutput("<ol style='font-family: Arial, sans-serif;' type='1'><li>To highlight, select the text by left-clicking and dragging the cursor over the desired sentences. Next, click on the appropriate <strong>Highlight</strong> button on the right-hand toolbar (Summary/Yellow, Commentary/Blue, Evidence/Green). If you have done this correctly, the text in your essay should now be highlighted with the color that you selected.<br/><br/></li> <li>If you make a mistake, you can select the desired text and click <strong>Un-highlight</strong> on the toolbar. This will remove all highlighting from the selected text.<br/><br/></li> <li>Once you are done highlighting the text in your essay, you can look at the statistics (stats) displayed beside each highlight button. The stats will tell you what percentage of your writing is Summary, Commentary, Evidence, or Unmarked. You can use this information to help you decide if you need to add, cut, or revise parts of your essay.<br/><br/></li> <li>If you highlight text without using the buttons in the toolbar or add/remove text from the essay, this may confuse the add-on and produce incorrect stats. Immediately click the <strong>Update Stats</strong> button to fix this.</li></ol><input type='button' value='Close' onclick='google.script.host.close()' />")
  
  .setWidth(500)
    .setHeight(200);
  DocumentApp.getUi().showModalDialog(htmlOutput, 'Instructions');
}

function displayPopup() {
  var popup = HtmlService
    .createHtmlOutput("<p>" + Logger.getLog() + "</p>")
    .setWidth(250)
    .setHeight(100);
  DocumentApp.getUi().showModalDialog(popup, '!');
}

function docLength(){//NOT necessarily equivalent to DocumentApp.getActiveDocument().getBody().editAsText().getText().length
  var total = 0;
  paras = DocumentApp.getActiveDocument().getBody().getParagraphs();
  for (var para in paras){
    if (paras[para].editAsText() ){
      total += paras[para].editAsText().getText().length;
    }
  }
  numChars = total;
  return total;
}

function endOfDoc(cumulativeIndex){//this uses the same cumulativeCount as calculated in statsLogger() and docLength(). NOT necessarily equivalent to DocumentApp.getActiveDocument().getBody().editAsText().getText().length
  return cumulativeIndex >= docLength()-1;
}

function charLength(){
  return numChars;
}

//element.getStartOffset() doesn't return a cumulative index, only the index within a paragraph.
//takes a Range Element object
function getStartIndex(elementRange){
  var body = DocumentApp.getActiveDocument().getBody();
  if (elementRange.getElement().getType() == 'TEXT'){
    var paraIndex = body.getChildIndex(elementRange.getElement().getParent());//the index of the paragraph containing the elementRange
    if (paraIndex == 0){
      var startIndex = elementRange.getStartOffset();
      Logger.log('start index: ' + startIndex);
      return startIndex;
    }
    else if (paraIndex > 0){
      var paras = body.getParagraphs();
      var cumulativeCount = 0;
      var i = 0;
      while (i < paraIndex){
        cumulativeCount += paras[i].getText().length;
        i++;
      }
      var startIndex = cumulativeCount + elementRange.getStartOffset();
      Logger.log('start index: ' + startIndex);
      return startIndex;
    }
  }
  if (elementRange.getElement().getType() == 'PARAGRAPH'){
    var paraIndex = body.getChildIndex( elementRange.getElement() );//the paragraph index of elementRange
    if (paraIndex == 0){
      Logger.log('start index: 0');
      return 0;
    }
    else if (paraIndex > 0){
      var paras = body.getParagraphs();
      var cumulativeCount = 0;
      var i = 0;
      while (i < paraIndex){
        cumulativeCount += paras[i].getText().length
        i++;
      }
      Logger.log('start index: ' + cumulativeCount);
      return cumulativeCount;
    }
  }
}

//takes a Range Element object
function getEndIndex(elementRange){
  var body = DocumentApp.getActiveDocument().getBody();
  if (elementRange.getElement().getType() == 'TEXT'){
    var paraIndex = body.getChildIndex(elementRange.getElement().getParent());//the index of the paragraph containing the elementRange
    if (paraIndex == 0){
      var endIndex = elementRange.getEndOffsetInclusive();
      Logger.log('end index: ' + endIndex);
      return endIndex;
    }
    else if (paraIndex > 0){
      var paras = body.getParagraphs();
      var cumulativeCount = 0;
      var i = 0;
      while (i < paraIndex){
        cumulativeCount += paras[i].editAsText().getText().length;
        i++;
      }
      var endIndex = cumulativeCount + elementRange.getEndOffsetInclusive();
      Logger.log('end index: ' + endIndex);
      return endIndex;
    }
  }
  if (elementRange.getElement().getType() == 'PARAGRAPH'){
    var paraIndex = body.getChildIndex( elementRange.getElement() );
    if (paraIndex == 0){
      var endIndex = elementRange.getElement().getText().length;
      Logger.log('end index: ' + endIndex);
      return endIndex;
    }
    else if (paraIndex > 0){
      var cumulativeCount = 0;
      var i = 0;
      while (i <= paraIndex){// <= so it will count the cumulative paragraph length until the end of the current one
        cumulativeCount += elementRange.getElement().getText().length;
        i++;
      }
      Logger.log('end index: ' + cumulativeCount);
      return cumulativeCount;
    }
  }
}

function highlightText(background){
  var selection = DocumentApp.getActiveDocument().getSelection();
  if (selection) {
    var elements = selection.getRangeElements();
    //Logger.log(elements);
    var start = getStartIndex(elements[0]);
    var end = getEndIndex(elements[elements.length-1])
    Logger.log('START INDEX: ' + start);
    Logger.log('END INDEX: ' + end);
    
    for (var i = 0; i < elements.length; i++) {
      Logger.log('*********************************************************');
      Logger.log(i);
      //Logger.log('length of elements: ' + elements.length);
      var element = elements[i];
      var test1 = element.getElement().getType() == 'TEXT';
      var test2 = element.getElement().getType() == 'PARAGRAPH';
      //Logger.log('text? ' + test1);
      //Logger.log('paragraph? ' + test2);
      //Logger.log('offsets: ' + element.getStartOffset() + ' ' + element.getEndOffsetInclusive() );
      
      // Only modify elements that can be edited as text; skip images and other non-text elements.
      if (element.getElement().editAsText && element.getElement().getType() == 'TEXT') {
        var text = element.getElement().editAsText();
        
        // Highlight the selected part of the element, or the full element if it's completely selected.
        text.setBackgroundColor(element.getStartOffset(), element.getEndOffsetInclusive(), background);
      }
      
      else if (element.getElement().editAsText && element.getElement().getType() == 'PARAGRAPH') {
        var text = element.getElement().editAsText();
        var body = DocumentApp.getActiveDocument().getBody();
        var paras = body.getParagraphs();
        Logger.log("this paragraph's length: " + element.getElement().getText().length);
        Logger.log('number of paragraphs: ' + paras.length);
        Logger.log("this paragraph's index: " + body.getChildIndex(element.getElement()));
        for (var para in paras){
          Logger.log('paragraph index: ' + body.getChildIndex(paras[para]));
          Logger.log('paragraph length: ' + paras[para].getText().length );
        }
        // Highlight the selected part of the element, or the full element if it's completely selected.
        text.setBackgroundColor(background);
      }
    }
    var docId = DocumentApp.getActiveDocument().getId();//unique document id, also in the url I think
    Logger.log('document ID: ' + docId);
    var current_time = new Date();
    //Logger.log(Utilities.formatDate(current_time, Session.getScriptTimeZone(), "yyyy/MM/dd HH:mm"));
    //if (background == null){
    //  background = 'null';
    //}
    addDataInFirebase(docId, start, end, background, current_time, true);
    Logger.log('data entry succesful');
  }
  else{
    var htmlOutput = HtmlService
      .createHtmlOutput("<p style='font-family: Arial, sans-serif;'>Please select some text and try again.</p><input type='button' value='Close' onclick='google.script.host.close()' />")
      .setWidth(300)
      .setHeight(100);
    DocumentApp.getUi().showModalDialog(htmlOutput, 'No Text Selected');
    var ui = DocumentApp.getUi();
  }
  return statsLogger(false);
}
/*
function output(){
  var body = DocumentApp.getActiveDocument().getBody();

// Define a custom paragraph style.
var style = {};
style[DocumentApp.Attribute.HORIZONTAL_ALIGNMENT] =
    DocumentApp.HorizontalAlignment.RIGHT;
style[DocumentApp.Attribute.FONT_FAMILY] = 'Calibri';
style[DocumentApp.Attribute.FONT_SIZE] = 18;
style[DocumentApp.Attribute.BOLD] = true;

// Append a plain paragraph.
var par = body.appendParagraph('A paragraph with custom style.');

// Apply the custom style.
par.setAttributes(style);
}*/

function statsLogger(snap){
  Logger.log('***************statsLogger() called********************');
  var doclen = docLength();
  Logger.log('snapshotCondition: ' + snap);
  var paras = DocumentApp.getActiveDocument().getBody().getParagraphs();
  var summary = 0;
  var commentary = 0;
  var evidence = 0;
  var nullChar = 0;
  var meta = {'#f3f315': 0, '#39ff14': 0, '#0dd5fc': 0, 'null': 0};
  var charCount = 0;//cumulative count of characters
  var currentColor = -1;//snapshot condition
  var start = 0;//snapshot condition
  var end = 0;//snapshot condition
  var snapshotCondition = snap;//snapshot condition
  var current_time = Utilities.formatDate(new Date(), "GMT", "MM-dd-yyyy HH:mm:ss 'GMT'Z");//snapshot condition
  var docId = DocumentApp.getActiveDocument().getId();//snapshot condition
  var UCS = 0//unidentified color sightings
  var xi = 0
  
  if(doclen == 0)
  {
    return [summaryStats, commentaryStats, evidenceStats, nullCharStats, UCS];
  }
  
  for(var x in paras){
  Logger.log('***************body loop*******************');
    xi++;
    para = paras[x].editAsText();
    var paraLength = para.getText().length;
    Logger.log('paragraph index: '+xi);
    Logger.log("paragraph length: " + paraLength);
    Logger.log('starting charCount: ' +charCount);
    //var i = 0;//index of characters within a paragraph
    
    for(var i = 0; i<paraLength; ++i){
      var color = para.getBackgroundColor(i);
      var metaColor = String(color)
      
      if (metaColor=='#f3f315'||metaColor=='#39ff14'||
      metaColor=='#0dd5fc'||metaColor=='null'){
        ++meta[metaColor];
        if (color != currentColor || charCount == doclen-1){
        Logger.log('<<<<<<<<<<different color range detected>>>>>>>>>');
          (charCount == doclen-1) ? end = charCount+1 : end = charCount; //if at end, correct for 0-indexing
          if (snapshotCondition && currentColor != -1){
            addDataInFirebase(docId, start, end, currentColor, current_time, false);
          }
          currentColor = color;
          start = charCount;
          summary = meta['#f3f315']; evidence = meta['#39ff14'];
          commentary = meta['#0dd5fc']; nullChar = meta['null'];
        }
        /*
        else if (charCount == doclen-1)
        {
          Logger.log('<<<<<<<<<<statsLogger() else if condition reached>>>>>>>>>');
          end = charCount+1;
          if (snapshotCondition && currentColor != -1)
          {
            addDataInFirebase(docId, start, end, currentColor, current_time, false);
          }
          currentColor = color;
          start = charCount;
          summary = meta['#f3f315']; evidence = meta['#39ff14'];
          commentary = meta['#0dd5fc']; nullChar = meta['null'];
        }
        */
      }
      else{
        UCS++;
      }
      charCount++;
    }//end of for-loop through each char in a para
    Logger.log('ending charCount: '+charCount);
    /*
    if (snapshotCondition && endOfDoc(charCount) && !endOfDoc(end)){
    Logger.log('################################################################');
    Logger.log('statsLogger() if condition reached');
    end = charCount-1;
      addDataInFirebase(docId, start, end, currentColor, current_time, false);
    }
    */
  }//end of for-loop through body paragraphs
  Logger.log('end: '+end);

  //imperfect stats, does not add up to 100
  //these are returned if allocation-of-remainder-algorithm doesn't add up to 100
  var summaryStats = summary/(summary+commentary+evidence+nullChar);
  var commentaryStats = commentary/(summary+commentary+evidence+nullChar);
  var evidenceStats = evidence/(summary+commentary+evidence+nullChar);
  var nullCharStats = nullChar/(summary+commentary+evidence+nullChar);
  
  //sets up variables for allocation-of-remainder-algorithm to calculate stats that add up to 100
  var summaryStatsFloor = Math.round(Math.floor(summaryStats*100));
  var commentaryStatsFloor = Math.round(Math.floor(commentaryStats*100));
  var evidenceStatsFloor = Math.round(Math.floor(evidenceStats*100));
  var nullCharStatsFloor = Math.round(Math.floor(nullCharStats*100));
  
  var remainder = 100 - (summaryStatsFloor + commentaryStatsFloor + evidenceStatsFloor + nullCharStatsFloor);
  //Logger.log(remainder);
  
  //only returns clean stats that add to 100, otherwise imperfect stats up to the hundredth are returned
  if (remainder < 4){
    var i = 1;
    
    var summaryFloat = summaryStats*100 - summaryStatsFloor;
    var commentaryFloat = commentaryStats*100 - commentaryStatsFloor;
    var evidenceFloat = evidenceStats*100 - evidenceStatsFloor;
    var nullFloat = nullCharStats*100 - nullCharStatsFloor;
    
    //each stat type must have the same indexes
    var floats = [summaryFloat, commentaryFloat, evidenceFloat, nullFloat];
    var toAdd = [summaryStatsFloor, commentaryStatsFloor, evidenceStatsFloor, nullCharStatsFloor];
    var final = [summaryStatsFloor, commentaryStatsFloor, evidenceStatsFloor, nullCharStatsFloor];
    
    while (i <= remainder){
      var index = floats.indexOf( Math.max.apply(null, floats) );
      final[index]++;//this one will be returned
      toAdd[index] = 0;//once incremented, we move onto the next highest float remainder to increment if still under 100%
      floats[index] = 0;//same as toAdd
      i++;
    }

    if (final[0] + final[1] + final[2] + final[3] == 100){
      for (var index in final){
        final[index] = final[index]/100;
      }
      Logger.log('unidentified color sightings: ' + UCS);
      final.push(UCS);
      Logger.log('final: '+final);
      return final;
    }
  }
  //these stats show up to the hundredth decimal place, they're the backup stats
  var stats = [summaryStats, commentaryStats, evidenceStats, nullCharStats];
  Logger.log('unidentified color sightings: ' + UCS);
  //getVisualizationData(docId);
  stats.push(UCS);
  Logger.log('stats: '+stats);
  return stats;
}

function logger(message){
  Logger.log(message);
}

//D3 test code
/*
function doGet() {

   return HtmlService.createTemplateFromFile('UI').evaluate().setTitle("Test").setSandboxMode(HtmlService.SandboxMode.IFRAME)
 }*/