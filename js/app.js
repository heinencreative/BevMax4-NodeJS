var arnieApp = angular.module('arnieApp',[]);

arnieApp.controller('ArnieController', ['$scope', '$http', function($scope, $http) {

  $scope.alreadyConnected = false;
  $scope.sessionStarted = false;
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
    $http.get('/startsession').success(function(data){
      $scope.sessionStarted = true;
      seconds = 30; // 30 second count down
      countdown();
      console.log("started session", data);
    });
  };

  // End vending session
  $scope.endSession = function(){
    $http.get('/endsession').success(function(data){
      $scope.sessionStarted = false;
      clearTimeout(timer);
      console.log("ended session", data);
    });
  };

  // Count down from X to
  function countdown(){
    if (seconds === 0) {
      endSession();
      return;
    }
    $scope.time = seconds;
    seconds --;
    timer = setTimeout(countdown, 1000);
  }



}]);
