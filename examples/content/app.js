/*
 * Sample JavaScript app using some of the QuckBlock WebSDK APIs
 *
 * Author: Dan Murphy (dan@quickblox.com)
 *
 */

(function () {
  APP = new App();
  $(document).ready(function(){
    APP.init();
    $.ajaxSetup({cache:true});
    $.getScript('//connect.facebook.net/en_UK/all.js', function(){
      FB.init({
        appId: '143947239147878',
        status: true,
        cookie: true
      });
    });
  });
}());

function App(){
  console.debug('App constructed');
}

App.prototype.init = function(){
  var _this= this;
  //this.compileTemplates();
  $('#facebookButton').click(function(e){e.preventDefault(); _this.facebookLogin(e); return false;});
  $('#sessionButton').click(function(e){e.preventDefault(); _this.createSession(e); return false;});
  $('#sessionDeleteButton').click(function(e){e.preventDefault(); _this.deleteSession(e); return false;});
  $('#createContentButton').click(function(e){e.preventDefault(); _this.createContent(e); return false;});
};

App.prototype.compileTemplates = function(){
  var template = $('#content-template').html();
  this.template = Handlebars.compile(template);
};

App.prototype.createSession = function(e){
  var form, appId, authKey, secret, _this = this;
  console.debug('createSession', e);
  form = $('#apiSession');
  appId = form.find('#appId')[0].value;
  authKey = form.find('#authKey')[0].value;
  secret = form.find('#secret')[0].value;
  console.debug(form, appId, authKey, secret);
  QB.init(appId,authKey,secret, true);
  if (this.facebook) {
    QB.createSession({provider:'facebook', keys: {token: this.facebook.accessToken}}, function(e,r){_this.sessionCallback(e,r);});
  } else {
    QB.createSession(function(e,r){_this.sessionCallback(e,r);});
  }
};

App.prototype.sessionCallback= function(err, result){
  console.debug('Session create callback', err, result);
  if (result){
    $('#session').append('<p><em>Created session</em>: ' + JSON.stringify(result) + '</p>');
    $('#sessionDeleteButton').removeAttr('disabled');
  } else {
    $('#session').append('<p><em>Error creating session token<em>: ' + JSON.stringify(err)+'</p>');
  }
};

App.prototype.deleteSession = function(e){
  var token = QB.session.token;
  console.debug('deleteSession', e);
  QB.destroySession(function(err, result){
    console.debug('Session destroy callback', err, result);
    if (result) {
      $('#session').append('<p><em>Deleted session token</em>: ' + token + '</p>');
      $('#sessionDeleteButton').attr('disabled', true);
    } else {
      $('#session').append('<p><em>Error occured deleting session token</em>: ' + JSON.stringify(err) + '</p>');
    }
  });
};

App.prototype.createContent= function(e){
  var form, name, type, isPublic, tags, _this= this;
  console.debug('createContent', e);
  form = $('#createContent');
  name = form.find('#name')[0].value;
  isPublic = form.find('#public')[0].value === 'true';
  type = form.find('#type')[0].value;
  tags = form.find('#tags')[0].value;
  QB.content.create({name: name, public: isPublic, content_type: type, tag_list: tags}, function(err,result){
    console.debug('create content callback', err, result);
    $('#contentList').empty();
    if (result) {
      $('#contentList').append('<p>' + JSON.stringify(result) + '</p>');
      var file = form.find('#file')[0].files[0];
      //var formData = new FormData($('#createContent')[0]);
      //console.log(formData);
      var uri = parseUri(result.blob_object_access.params);
      console.log(uri);
      var params = { url: uri.protocol + '://' + uri.host };
      var data = new FormData();
      data.append('AWSAccessKeyId', uri.queryKey.AWSAccessKeyId);
      data.append('Signature', uri.queryKey.Signature);
      data.append('acl', uri.queryKey.acl);
      data.append('key', uri.queryKey.key);
      data.append('success_action_status', uri.queryKey.success_action_status);
      data.append('Filename',  result.name);
      data.append('Policy', uri.queryKey.Policy);
      data.append('Content-Type', uri.queryKey['Content-Type']);
      data.append('file', file);
      params.data = data;
      QB.content.upload(params, function(err,res){
        $('#contentList').append(JSON.stringify(res));
        $('#contentList').append(JSON.stringify(err));
      });
    } else {
      $('#usersList').append('<p><em>Error creating content</em>:' + JSON.stringify(err) + '</p>');
    }
  });
};

App.prototype.facebookLogin = function (e){
  var _this = this;
  console.debug('facebookLogin', e);
  FB.getLoginStatus(function(response) {
    if (response.status === 'connected') {
        $('#session').append('<p><em>Facebook: ' + JSON.stringify(response) + '</p>');
      _this.facebook = response.authResponse;
    } else {
      FB.Event.subscribe('auth.authResponseChange', function(response) {
        console.debug('FB Auth change', response);
        $('#session').append('<p><em>Facebook: ' + JSON.stringify(response) + '</p>');
        if (response.status === 'connected'){
          _this.facebook = response.authResponse;
        } else {
          _this.facebook = null;
        }
      });
      FB.login();
    }
  });
};


// parseUri 1.2.2
// (c) Steven Levithan <stevenlevithan.com>
// MIT License
// http://blog.stevenlevithan.com/archives/parseuri

function parseUri (str) {
	var	o   = parseUri.options,
		m   = o.parser[o.strictMode ? "strict" : "loose"].exec(str),
		uri = {},
		i   = 14;

	while (i--) uri[o.key[i]] = m[i] || "";

	uri[o.q.name] = {};
	uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
		if ($1) uri[o.q.name][$1] = $2;
	});

	return uri;
};

parseUri.options = {
	strictMode: false,
	key: ["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],
	q:   {
		name:   "queryKey",
		parser: /(?:^|&)([^&=]*)=?([^&]*)/g
	},
	parser: {
		strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
		loose:  /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
	}
};
