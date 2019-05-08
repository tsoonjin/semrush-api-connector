/**
 * Constructor for SemrushClient
 *
 * @param propertiesService {object} - An object with same interface as Google's PropertyService
 * @param urlFetchApp {object} - An object with same interface as Google's UrlFetchApp
 * @param requestConfig {object} - A request configuration
 *
 * @return {object} a Connector object.
 */
function SemrushClient(propertiesService, urlFetchApp, requestConfig) {
  this.propertiesService = propertiesService;
  this.urlFetchApp = urlFetchApp;
  this.requestConfig = requestConfig;

  return this;
}

/**
 * @return {array} Array of Spotify play objects
 */
SemrushClient.prototype.getSEOInfo = function() {
  var dataCache = this.propertiesService.getScriptProperties().getProperty('DATA');
  var result = null;
  result = this.fetchFromCache(dataCache);
  if (!result && this.shouldRefreshData(this.requestConfig['refreshRate'])) {
    console.log('Refresh cache');
    result = this.fetchFromApi(this.requestConfig);
    this.storeInCache(result);
  }

  return result;
};

// private

SemrushClient.prototype.fetchFromCache = function(resultString) {
  var result = null;
  console.log('Trying to fetch from cache...');
  try {
    result = JSON.parse(resultString);
    console.log('Fetched succesfully from cache');
  } catch (e) {
    console.log('Error when fetching from cache:', e);
  }
  return result;
};

SemrushClient.prototype.storeInCache = function(result) {
  var cachedDate = new Date().toISOString();
  console.log('Setting data to cache...');
  try {
    this.propertiesService.getScriptProperties().setProperty('DATE', cachedDate);
    this.propertiesService.getScriptProperties().setProperty('DATA', JSON.stringify(result));
  } catch (e) {
    console.log('Error when storing in cache', e);
  }
};

// Get keywords sorted in ascending order of difficulty to wrestle control from competitors
SemrushClient.prototype.getKeywordsToFocus = function(url) {
  // var url = this.requestConfig['apiEndpoint'] + '/?type=domain_domains&database=my&display_limit=10&domains=*|or|sinarharian.com.my|*|or|utusan.com.my|*|or|bharian.com.my&display_sort=kd_asc&key=' + apiKey;
  console.log('Keyword Gap Analysis Report: Requesting URL %s', url);
  var result = JSON.parse(this.urlFetchApp.fetch(url));
  return {
    keywords: result['keywords']
  };
};

SemrushClient.prototype.getSiteVisibility = function(url) {
  // Domain pattern that will be considered for measurement
  // var trackedURL = '*.' + rootDomain + '%2F*';
  // var url = this.requestConfig['apiEndpoint'] + '/reports/v1/projects/' + projectId + '/tracking/info?key=' + apiKey + '&action=report&type=tracking_overview_organic&linktype_filter=0&url=' + trackedURL + '&serp_feature_filter=fsn';
  var result = JSON.parse(this.urlFetchApp.fetch(url));
  console.log('Visibilty Report: Requesting URL %s', url, result);
  return {
    visibility: result['visibility']
  };
};

SemrushClient.prototype.getSiteAudit = function(url) {
  // var url = this.requestConfig['apiEndpoint'] + '/reports/v1/projects/' + projectId + '/siteaudit/info?key=' + apiKey;
  console.log('Site Audit Report: Requesting URL %s', url, this.urlFetchApp.fetch(url));
  var result = JSON.parse(this.urlFetchApp.fetch(url));
  return {
    url: result['url'],
    errors: result['errors'],
    quality: result['current_snapshot']['quality']['value'] / 100,
    quality_delta: result['current_snapshot']['quality']['delta'],
    site_performance: result['current_snapshot']['thematicScores']['performance']['value'] / 100
  };
};

SemrushClient.prototype.fetchFromApi = function(config) {
  var siteAuditURL = config['siteAuditURL'];
  var positionTrackingURL = config['positionTrackingURL'];
  var keywordGapAnalysisURL = config['keywordGapAnalysisURL'];
  var overallResult = this.getSiteAudit(siteAuditURL);
  var siteVisibility = this.getSiteVisibility(positionTrackingURL);
  var recommendedKeywords = this.getKeywordsToFocus(keywordGapAnalysisURL);
  overallResult['visibility'] = siteVisibility['visibility'];
  overallResult['keywords'] = recommendedKeywords['keywords'];
  console.log('Overall Result', overallResult);
  return overallResult;
};

SemrushClient.prototype.shouldRefreshData = function(refreshRate) {
  var lastRetrievalDate = this.propertiesService.getScriptProperties().getProperty('DATE');

  console.log('Should refresh data', lastRetrievalDate);
  if (!lastRetrievalDate) {
    console.log('Cache is empty');
    return true;
  }
  var today = new Date();
  var oneDay = 24 * 60 * 60 * 1000;
  var diffDays = Math.round(Math.abs((today.getTime() - new Date(lastRetrievalDate).getTime()) / (oneDay)));
  return diffDays >= refreshRate;
};

/* global exports */
/* istanbul ignore next */
if (typeof(exports) !== 'undefined') {
  exports['__esModule'] = true;
  exports['default'] = SemrushClient;
}
