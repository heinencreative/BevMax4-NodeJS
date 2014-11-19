var arnieApp = angular.module('arnieApp',[]);

arnieApp.controller('ArnieController', ['$scope', '$http', '$timeout', function($scope, $http, $timeout) {
  // TODO: should these be individual or just tied to the status obj?
  $scope.status = {}; // TODO: use this instead of the below vars
  $scope.overlay = true; // Start with overlay
  $scope.serialPortOpen = false;
  $scope.alreadyConnected = false;
  $scope.sessionStarted = false;
  $scope.vendInProgress = false;
  $scope.vendSuccess = false;
  $scope.time = '';

  var timer,
      seconds;

  // When the app starts, connect to PC2MDB
  if(!$scope.alreadyConnected){
    $http.get('/connect').success(function(data){
      console.log("connected to machine", data);
      $scope.status = data;
      // TODO: replace alreadyConnect with machineReady?
      $scope.alreadyConnected = true;
      $timeout(function(){
        $scope.overlay = false; // Hide startup overlay
      },1500);
    });
  }

  // Start vending session
  $scope.startSession = function(){
    // TODO: page should be disabled untile machineReady is true
    $http.get('/status').success(function(data){
      console.log('startsession status',data);
    });

    $http.get('/startsession').success(function(data){
      $scope.sessionStarted = true;
      seconds = 30; // 30 second count down
      countdown();
      console.log("started session", data);
    });
  };

  // End vending session
  $scope.endSession = function(){
    // First checkstatus to see if vend is taking place
    $http.get('/status').success(function(data){
      console.log('endsession status',data);
    $scope.vendInProgress = data.vendInProgress;
      // If a vend is already in progress, prevent cancel
      if (!$scope.vendInProgress) {
        // Request to end session
          $http.get('/requestendsession').success(function(data){
            clearTimeout(timer);
            console.log("requested end session", data);
            // Actually end the session
            $http.get('/endsession').success(function(){
              console.log("ended session", data);
              // Reset scope vars
              $scope.vendInProgress = data.vendInProgress;
              $scope.sessionStarted = data.sessionStarted;
            });
          });
        }
    });
  };
  
  // Check status
  $scope.status = function(){
  	$http.get('/status').success(function(data){
  		$scope.status = data;
  	});
  };

  // Count down from X to 0
  function countdown(){
    $http.get('/status').success(function(data){
      console.log('ping status',data);
      // Continuously set vars until session is ended
      $scope.sessionStarted = data.sessionStarted;
      $scope.vendInProgress = data.vendInProgress;
      $scope.vendSuccess = data.vendSuccess;

      // As long as no vend is in progress, keep counting down
      if (!$scope.vendInProgress && !$scope.vendSuccess) {
        if (seconds === 0) {
            $scope.endSession();
          return;
        }
        $scope.time = seconds;
        seconds --;
      } else if ($scope.vendSuccess) {
        // If the session was successful, clearTimeout()
        console.log('clearTimeout');
        clearTimeout(timer);
      }
      // TODO: add case for when user is stupid and selects an empty row, then chastise them.
      timer = setTimeout(countdown, 1000);
    });
  }



}]);
