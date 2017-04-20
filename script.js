/**
  Code written and adapted by Andrew Petriccione
  University of North Carolina Asheville Spring 2017
  For Computer Science Senior Project 
  Google/Firebase copyright information:
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

  var messageBox;
  var markerArray = [];

  // Initializes ErwinWifiMap.
  function WifiMap() {
    this.checkSetup();

    // Shortcuts to DOM Elements.
    this.messageList = document.getElementById('messages');
    this.messageForm = document.getElementById('message-form');
    this.messageInput = document.getElementById('message');
    this.submitButton = document.getElementById('submit');
    this.messageInput.disabled = "true";
    this.userPic = document.getElementById('user-pic');
    this.userName = document.getElementById('user-name');
    this.signInButton = document.getElementById('sign-in');
    this.signOutButton = document.getElementById('sign-out');
    this.signInSnackbar = document.getElementById('must-signin-snackbar');

    // Saves message on form submit.
    //currently using mouseover event to reenable submit button
    this.messageForm.addEventListener('submit', this.saveMessage.bind(this));
    this.signOutButton.addEventListener('click', this.signOut.bind(this));
    this.signInButton.addEventListener('click', this.signIn.bind(this));

    // Toggle for the button.
    var buttonTogglingHandler = this.toggleButton.bind(this);
    buttonTogglingHandler();

    this.messageInput.addEventListener('change', buttonTogglingHandler);


    this.initFirebase();
  }

  // Sets up shortcuts to Firebase features and initiate firebase auth.
  WifiMap.prototype.initFirebase = function() {
    // shortcuts to firebase SDK features.
    this.auth = firebase.auth();
    this.database = firebase.database();
    this.storage = firebase.storage();
    //initiates firebase auth and listen to auth state changes.
    this.auth.onAuthStateChanged(this.onAuthStateChanged.bind(this));

  };

  //loads locations to the map and listens for new ones.
  WifiMap.prototype.loadLocations = function() {
      pullLatLngs();
  };//loadLocations()
  
  // Loads location/message history and listens for upcoming ones.
  WifiMap.prototype.loadMessages = function() {
    // Reference to the /messages/ database path.
    this.messagesRef = this.database.ref('messages');

    // Make sure we remove all previous listeners.
    this.messagesRef.off();

    // Loads the last 12 messages and listens for new ones.
    var setMessage = function(data) {
      var val = data.val();
      this.displayMessage(data.key, val.name, val.streetAddress, val.photoUrl, val.imageUrl);
    }.bind(this);
    this.messagesRef.limitToLast(12).on('child_added', setMessage);
    this.messagesRef.limitToLast(12).on('child_changed', setMessage);
  };

  // Displays a previously saved location/Message in the UI.
  WifiMap.prototype.displayMessage = function(key, name, text, picUrl, imageUri) {
    var div = document.getElementById(key);
    // If an element for that message does not exists yet we create it.
    if (!div) {
      var container = document.createElement('div');
      container.innerHTML = WifiMap.MESSAGE_TEMPLATE;
      div = container.firstChild;
      div.setAttribute('id', key);
      this.messageList.appendChild(div);
    }
    if (picUrl) {
      div.querySelector('.pic').style.backgroundImage = 'url(' + picUrl + ')';
    }
    div.querySelector('.name').textContent = name;
    var messageElement = div.querySelector('.message');
    if (text) { // If the message is text.
      messageElement.textContent = text;
      // Replace all line breaks by <br>.
      messageElement.innerHTML = messageElement.innerHTML.replace(/\n/g, '<br>');
    } else if (imageUri) { // If the message is an image.
      var image = document.createElement('img');
      image.addEventListener('load', function() {
        this.messageList.scrollTop = this.messageList.scrollHeight;
      }.bind(this));
      this.setImageUrl(imageUri, image);
      messageElement.innerHTML = '';
      messageElement.appendChild(image);
    }
    // Show the card fading-in.
    setTimeout(function() {div.classList.add('visible')}, 1);
    this.messageList.scrollTop = this.messageList.scrollHeight;
    this.messageInput.focus();
  };//displayMessage()

  //****************************************************************************************************
  //display locations in the UI
  WifiMap.prototype.displayLocation = function() {
    alert("display location");
  }

  // Saves a new message/location on the Firebase DB.
  WifiMap.prototype.saveMessage = function(e) {
    e.preventDefault();
    var streetAddress;
    var latlng;
    var locationInfo;
    // Check that the user entered a message and is signed in.
    if (this.messageInput.value && this.checkSignedInWithMessage()) {
      locationInfo = (this.messageInput.value).split(";", 2);
      streetAddress = locationInfo[0];
      latlng = locationInfo[1];
      var currentUser = this.auth.currentUser;
      // Add a new message entry to the Firebase Database.
      this.messagesRef.push({
        name: currentUser.displayName,
        streetAddress: streetAddress,
        latlng: latlng,  
        photoUrl: currentUser.photoURL || '../images/profile_placeholder.png'
      }).then(function() {
        //clear message text field and SEND button state.
        WifiMap.resetMaterialTextfield(this.messageInput);
        //this.toggleButton();
      }.bind(this)).catch(function(error) {
        console.error('Error writing new message to Firebase Database.', error);
      });
    }
  };

    // Signs-in wifimap.
  WifiMap.prototype.signIn = function() {
    // Sign in firebase using redirect auth with Google as the identity provider    
    var provider = new firebase.auth.GoogleAuthProvider();
    this.auth.signInWithRedirect(provider);
  };

  // Signs-out of wifimap.
  WifiMap.prototype.signOut = function() {
    // Sign out of Firebase.
    this.auth.signOut();
  };

  // Triggers when the auth state change for instance when the user signs-in or signs-out.
  WifiMap.prototype.onAuthStateChanged = function(user) {
    if (user) { // User is signed in!
      // Get profile pic and user's name from the Firebase user object.
      var profilePicUrl = user.photoURL;   // Get profile pic.
      var userName = user.displayName;        // Get user's name.

      // Set the user's profile pic and name.
      this.userPic.style.backgroundImage = 'url(' + profilePicUrl + ')';
      this.userName.textContent = userName;

      // Show user's profile and sign-out button.
      this.userName.removeAttribute('hidden');
      this.userPic.removeAttribute('hidden');
      this.signOutButton.removeAttribute('hidden');

      // Hide sign-in button.
      this.signInButton.setAttribute('hidden', 'true');

      // We load currently existing messages.
      this.loadMessages();

        //we load currently existing locations
        this.loadLocations();
        
      // We save the Firebase Messaging Device token and enable notifications.
      this.saveMessagingDeviceToken();
    } else { // User is signed out!
      // Hide user's profile and sign-out button.
      this.userName.setAttribute('hidden', 'true');
      this.userPic.setAttribute('hidden', 'true');
      this.signOutButton.setAttribute('hidden', 'true');

      // Show sign-in button.
      this.signInButton.removeAttribute('hidden');
    }
  };

  // Returns true if user is signed-in. Otherwise false and displays a message.
  WifiMap.prototype.checkSignedInWithMessage = function() {
    // return true if the user is signed IN firebase
    if (this.auth.currentUser) {
      return true;
    }
    // Display a message to the user using a Toast.
    var data = {
      message: 'You must sign-in first',
      timeout: 2000
    };
    this.signInSnackbar.MaterialSnackbar.showSnackbar(data);
    return false;
  };

  // Saves the messaging device token to the datastore.
  WifiMap.prototype.saveMessagingDeviceToken = function() {
    firebase.messaging().getToken().then(function(currentToken) {
      if (currentToken) {
        console.log('Got FCM device token:', currentToken);
        // Saving the Device Token to the datastore.
        firebase.database().ref('/fcmTokens').child(currentToken).set(firebase.auth().currentUser.uid);
      } else {
        // Need to request permission to show notifications.
        this.requestNotificationsPermissions();
      }
    }.bind(this)).catch(function(error) {
      console.error('Unable to get messaging token.', error);
    });
  };

  // Requests permissions to show notifications.
  WifiMap.prototype.requestNotificationsPermissions = function() {
    console.log('Requesting notifications permission...');
    firebase.messaging().requestPermission().then(function() {
      // Notification permission granted.
      this.saveMessagingDeviceToken();
    }.bind(this)).catch(function(error) {
      console.error('Unable to get permission to notify.', error);
    });
  };

  // Resets the given MaterialTextField.
  WifiMap.resetMaterialTextfield = function(element) {
    element.value = '';
    element.parentNode.MaterialTextfield.boundUpdateClassesHandler();
  };

  // Template for messages.
  WifiMap.MESSAGE_TEMPLATE =
      '<div class="message-container">' +
        '<div class="spacing"><div class="pic"></div></div>' +
        '<div class="message"></div>' +
        '<div class="name"></div>' +
      '</div>';

  // A loading image URL.
  WifiMap.LOADING_IMAGE_URL = 'https://www.google.com/images/spin-32.gif';

  // Enables or disables the submit button depending on the values of the 
  // input fields.
  
  WifiMap.prototype.toggleButton = function() {
    if (true) {
      this.submitButton.removeAttribute('disabled');
    } else {
      this.submitButton.setAttribute('disabled', 'true');
    }
  };

  // Checks that the Firebase SDK has been correctly setup and configured.
  WifiMap.prototype.checkSetup = function() {
    if (!window.firebase || !(firebase.app instanceof Function) || !window.config) {
      window.alert('You have not configured and imported the Firebase SDK. ' +
          'Make sure you go through the codelab setup instructions.');
    } else if (config.storageBucket === '') {
      window.alert('Your Cloud Storage bucket has not been enabled. Sorry about that. This is ' +
          'actually a Firebase bug that occurs rarely. ' +
          'Please go and re-generate the Firebase initialisation snippet (step 4 of the codelab) ' +
          'and make sure the storageBucket attribute is not empty. ' +
          'You may also need to visit the Storage tab and paste the name of your bucket which is ' +
          'displayed there.');
    }
  };
//
//  window.onload = function() {
//    window.wifiMap = new WifiMap();
//    initMap(); 
//      
//  };




function pullLatLngs() { 
   var rootRef = firebase.database().ref().child("messages");
   var str = "";
    var lat = "";
    var lng = "";
    var formattedLatLng = "";
   rootRef.on("child_added", snap => {
     var latlng = snap.child("latlng").val();
     var streetAddress = snap.child("streetAddress").val();   
     lat = latlng.substring(latlng.indexOf('(', 0) + 1, latlng.indexOf(',', 0));
     lng = latlng.substring(latlng.indexOf(',', 0) + 1, latlng.indexOf(')', 0));
     formattedLatLng = "{" + lat + "," + lng + "}";
     markerArray.push({location: formattedLatLng, address: streetAddress});
       console.log("child added: " + formattedLatLng);
     // The following group uses the location array to create an array of markers on initialize.
      //createMarker(map, markerArray.pop().streetAddress);
       codeAddress(streetAddress);
   });//on child_added
    //initMap();
};






    function createMarker(map, location) {
        //alert("createMarker function called");
        console.log("Adding marker to this location: " + codeAddress(location));
        var marker = new google.maps.Marker({
           map: map,
            position: codeAddress(location),
            title: "title",
            animation: google.maps.Animation.DROP
        });
        markers.push(marker);
    };//createMarker

      // This function takes in a COLOR, and then creates a new marker
      // icon of that color. The icon will be 21 px wide by 34 high, have an origin
      // of 0, 0 and be anchored at 10, 34).
      function makeMarkerIcon(markerColor) {
        var markerImage = new google.maps.MarkerImage(
          'http://chart.googleapis.com/chart?chst=d_map_spin&chld=1.15|0|'+ markerColor +
          '|40|_|%E2%80%A2',
          new google.maps.Size(21, 34),
          new google.maps.Point(0, 0),
          new google.maps.Point(10, 34),
          new google.maps.Size(21,34));
        return markerImage;
      };
//function that geocodes an address to a latlng value the Google Maps API can use.
  function codeAddress(address) {
    var geocoder2 = new google.maps.Geocoder();
    geocoder2.geocode( { 'address': address}, function(results, status) {
      if (status == 'OK') {
        map.setCenter(results[0].geometry.location);
        var marker = new google.maps.Marker({
            map: map,
            position: results[0].geometry.location
        });
      } else {
        console.log('Geocode error for the following reason: ' + status);
      }
    });
  }


//function to get street address from lat lng coordinates
    function reverseGeocodeAddress(geocoder, resultsMap) {
        window.wifiMap.messageInput.disabled = "false";
        
        $('#message').empty();
        var address = "";  
        geocoder.geocode({'address': point}, function(results, status) {
          if (status === google.maps.GeocoderStatus.OK) {
            WifiMap.prototype.toggleButton = true;
            resultsMap.setCenter(results[0].geometry.location);

              addressString = results[0].formatted_address;
              
              console.log("This is what's in the addressString var: " + addressString);
              addressNode = document.createTextNode(addressString);
              
              $('#message').val(addressString + "; \n" + results[0].geometry.location);
              
          } else {
            alert('Geocode was not successful for the following reason: ' + status);
          }
        });
        window.wifiMap.messageInput.disabled = "true";
      };//reverseGeocodeAddress()  

        
        //global array var for all the markers    
        var markers = [];     
        var map;
        
        var locations = [];    
        var point = "";
        var combined = [];
    
        var addressString = "";
    
    function initMap() {
        var erwin = {lat:35.618614, lng:-82.62656199999998};
        var asheville = {lat: 35.5946531, lng: -82.55577770000002};
        var image = 'https://developers.google.com/maps/documentation/javascript/examples/full/images/beachflag.png';
        
        //constructor creates a new map - only center and zoom required.
          map = new google.maps.Map(document.getElementById('map'), {
              center: erwin,
              zoom: 15
          });//initialize map var
        var geocoder = new google.maps.Geocoder();
        var largeInfowindow = new google.maps.InfoWindow();
        var bounds = new google.maps.LatLngBounds();
        var marker = new google.maps.Marker({
          position: erwin,
          title: 'Erwin Middle School',
          icon: image,
          map: map
        });
        
        
            //and populate based on that markers position
            function populateInfoWindow(marker, infowindow) {
                //check to make sure the infowindow is not already opened on
                //this marker
                if (infowindow.marker != marker) {
                    infowindow.marker = marker;
                    infowindow.setContent('<div>' + marker.title + '</div>');
                    infowindow.open(map, marker);
                    //make sure the marker property is cleared if the infowindow 
                    //is closed
                    infowindow.addListener('closeclick', function() {
                        infowindow.setMarker = null;
                    });
                }
                
            }//populateInfoWindow()
            
            //Add event listener for mouse clicks
        google.maps.event.addListener(map, "click", function (event) {
            var latitude = event.latLng.lat();
            var longitude = event.latLng.lng();
            locations.push(latitude);
            locations.push(longitude);
            point = "" +latitude +","+ longitude;
            console.log("point is: " + point);
            radius = new google.maps.Circle({map: map,
                        radius: 20,
                        center: event.latLng,
                        fillColor: '#717',
                        fillOpacity: 0.5,
                        strokeColor: '#AA0000',
                        strokeOpacity: 0.5,
                        strokeWeight: 2,
            });
            reverseGeocodeAddress(geocoder, map);

            map.panTo(new google.maps.LatLng(latitude,longitude));

        }); //end addListener
            
      }//initMap()



  window.onload = function() {
    
    window.wifiMap = new WifiMap();
    window.initMap(function() {
      pullLatLngs();  
    });
      
  };  