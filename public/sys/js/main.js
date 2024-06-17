angular.module('Maker Skill Tree', [])

/*The master controller*/
.controller('master', ($scope, $sce) => {
	m = $scope

	//Trust a string as rendereable HTML
	m.trustAsHtml = $sce.trustAsHtml


})

/*Turns off the ng-scope, et al. debug classes*/
.config([
	'$compileProvider', ($compileProvider) => {
		$compileProvider.debugInfoEnabled(false)
	}
])


/*Sample directive*/
/*.directive('sampleDirective', () => {
	return {
		restrict: 'A',
		scope: true,
		link: (scope, element, attrs) => {
		
		}
	}
})*/