$(document).ready(init_fireauth);


// Initialize Firebase
var firebase_config = {
    apiKey: "AIzaSyBhaAJRJXox7z2J4ctx4hjfrVIr0hnuIEs",
    authDomain: "infoeconomics-fdc81.firebaseapp.com",
    databaseURL: "https://infoeconomics-fdc81.firebaseio.com",
    projectId: "infoeconomics-fdc81",
    storageBucket: "infoeconomics-fdc81.appspot.com",
    messagingSenderId: "781990522346"
    };


function init_fireauth() {
  firebase.initializeApp(firebase_config);
  $('.logout_button').click(function(){ firebase.auth().signOut();});
  var firebase_auth = firebase.auth();
  firebase_auth.onAuthStateChanged(
    function(user) {
      $('#err_msg').hide();
      if (user) {
	navbar_display_user(user);
      } else {
	navbar_display_nouser();
      }
    }, function(error) {
      console.log(error);
    });
};

function with_user_token(loggedinFcn, loggedoutFcn){
  var auth = firebase.auth();
  var observer = function(user) {
    if (user == null){
      loggedoutFcn();
    } else {
      user.getIdToken().then(loggedinFcn);
      unsubscribe();
    }
  };
  var unsubscribe = auth.onAuthStateChanged(observer);
};

var USER = {  };

function navbar_display_user(user){
  $('nav .dropdown').show();
  if ('email' in user && user.email != null){
    var name = user.email;
    if (!user.emailVerified) {
      name += '<i class="unverified fa fa-question-circle-o"></i>';
    }
    $('nav .user_email').html(name).css('display', 'inline');
    $('i.unverified').tooltip({title: 'Unverified address', placement: 'left'});
  } else if ('phoneNumber' in user){
    $('nav .user_email').text(user.phoneNumber).css('display', 'inline');
  }
  $('nav .login_button').hide();
  $('nav .logout_button').css('display', 'inline');
  display_user_picture(user.photoURL);
}

function navbar_display_nouser(){
  clear_chart();
  $('nav .dropdown').hide();
  $('nav .user_email').text('').css('display', 'none');
  $('nav .login_button').css('display', 'inline');
  $('nav .logout_button').hide();
  $('nav .mugshot').hide();
}

function display_user_picture(url){
  if (typeof url != 'undefined' && url != null){
    $('nav .mugshot').css('background-image', 'url('+url+')')
    .css('display', 'inline-block');
  }
}
