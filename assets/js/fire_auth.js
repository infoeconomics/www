$(document).ready(init_fireauth);

function init_fireauth() {
  $('.logout_button').click(function(){ firebase.auth().signOut();});
  firebase.auth().onAuthStateChanged(
    function(user) {
      if (user) {
	navbar_display_user(user);
      } else {
	navbar_display_nouser();
      }
    }, function(error) {
      console.log(error);
    });
};

//window.addEventListener('load', function() { initApp(); });

/*
	//var login_btn = $('<a/>').text('Login').attr('href', 'login.html').addClass('btn');
	//$('#sign-in').html(login_btn);

 	// User is signed in.
	var displayName = user.displayName;
	var email = user.email;
	var emailVerified = user.emailVerified;
	var photoURL = user.photoURL;
	var uid = user.uid;
	var phoneNumber = user.phoneNumber;
	var providerData = user.providerData;
	console.log('user', JSON.stringify(user, null, '  '));
	user.getIdToken().then(function(accessToken) {
				 var logout_btn = $('<button/>').text('Logout')
						    .addClass('btn btn-link')
						    .click(function(){ firebase.auth().signOut();});
                                 var user_id = $('<div/>').text(email).addClass('user_id');
				 $('#sign-in').html(user_id).append(logout_btn);
			       });
 */

function navbar_display_user(user){
  $('nav .dropdown').show();
  $('nav .user_email').text(user.email).css('display', 'inline');
  $('nav .login_button').hide();
  $('nav .logout_button').css('display', 'inline');
  display_user_picture(user.photoURL);
}

function navbar_display_nouser(){
  $('nav .dropdown').hide();
  $('nav .user_email').text('').css('display', 'none');
  $('nav .login_button').css('display', 'inline');
  $('nav .logout_button').hide();
  $('nav .mugshot').hide();
}

function display_user_picture(url){
  if (typeof url != 'undefined'){
    $('nav .mugshot').css('background-image', 'url('+url+')')
    .css('display', 'inline-block');
  }
}
