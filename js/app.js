var arnieApp = angular.module('arnieApp',[]);

arnieApp.controller('ArnieController', ['$scope', '$http', function($scope, $http) {

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
      $scope.alreadyConnected = true;
    });
  }

  // Start vending session
  $scope.startSession = function(){
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

  // Count down from X to 0
  function countdown(){
  	$http.get('/status').success(function(data){
  		console.log('ping status',data);
  		// Continuously set vars until session is ended
  		$scope.sessionStarted = data.sessionStarted;
  		$scope.vendInProgress = data.vendInProgress;
      $scope.vendSuccess = data.vendSuccess;
  		console.log('!$scope.sessionStarted',!$scope.sessionStarted);
  		// As long as no vend is in progress, keep counting down
  		if (!$scope.vendInProgress && !$scope.vendSuccess) {
    		if (seconds === 0) {
      			$scope.endSession();
     	 		return;
    		}
    		$scope.time = seconds;
    		seconds --;
  		} else if ($scope.vendSuccess) {
  			// TODO change conditional so that if a vend has been successful clearTimout, right now it starts counting down again and does a second end session.
  			// If the status ping returns that the session has ended, clearTimeout
  			console.log('clearTimeout');
  			clearTimeout(timer);
  		}
  		timer = setTimeout(countdown, 1000);
  	});
  }



}]);
