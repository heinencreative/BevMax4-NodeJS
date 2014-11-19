var arnieApp = angular.module('arnieApp',[]);

arnieApp.controller('ArnieController', ['$scope', '$http', function($scope, $http) {

  $scope.alreadyConnected = false;
  $scope.sessionStarted = false;
  $scope.vendInProgress = false;
  $scope.time = '';

  var timer,
      seconds;

  // When the app starts, connect to PC2MDB
  if(!$scope.alreadyConnected){
    $http.get('/connect').success(function(data){
      console.log("connected to machine", data);
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
      $http.get('/requestendsession').success(function(data){
        $scope.sessionStarted = false;
        clearTimeout(timer);
        console.log("ended session", data);
      });
    });
  };

  // Count down from X to
  function countdown(){
    if (seconds === 0) {
      $scope.endSession();
      return;
    }
    $scope.time = seconds;
    seconds --;
    timer = setTimeout(countdown, 1000);
  }



}]);
