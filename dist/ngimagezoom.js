/**
 * @license AngularImage Zoom
 * License: MIT
 */
(function(window, document, angular) {
'use strict';
angular.module('imageZoom', []);

angular.module('imageZoom').run(['$templateCache', function($templateCache) {
    $templateCache.put('zoom-control.html','<div class=\"zoom-control__clip\">\r\n    <img ng-src=\"{{imageSrc}}\"/>\r\n    <div class=\"mark\"></div>\r\n</div>\r\n');

    $templateCache.put('zoom-image-container.html','<div class=\"zoom-image-container__clip\">\r\n    <img ng-src=\"{{imageSrc}}\"/>\r\n</div>\r\n');
}]);

angular
    .module('imageZoom')
    .directive('zoomControl', ['$rootScope', function ($rootScope) {

        function link(scope, element, attrs, ctrl) {

            var $ = angular.element,
                clip = $(element[0].querySelector('.zoom-control__clip')),
                image = clip.find('img'),
                mark = $(clip[0].querySelector('.mark')),
                origWidth = image[0].naturalWidth,
                origHeight = image[0].naturalHeight,
                markBoundingRect = mark[0].getBoundingClientRect();



            scope.imageSrc = ctrl.getImageUrl();
            scope.imageContainerElem = ctrl.getImageContainerElem();
            scope.imageContainerElemZoomed = scope.imageContainerElem[0].querySelector('.zoom-image-container__clip');


            scope.$on('zoom-imagesrc:changed', function(evt, newSrc) {
                scope.imageSrc = newSrc;
            });

            if (!origWidth || !origHeight) {
                image[0].addEventListener('load', onImageLoaded);
            }

            function onImageLoaded(evt) {

                origWidth = image[0].naturalWidth;
                origHeight = image[0].naturalHeight;
                //console.log('loaded', evt.currentTarget, origWidth, origHeight);

                ctrl.setOrigDimensions(origWidth, origHeight);

                if(scope.imageContainerElem && scope.imageContainerElem.length > 0) {

                    if(scope.imageContainerElemZoomed) {
                        initMark();
                    } else {
                        scope.$on('zoom-imagecontainer:found', initMark());
                    }

                }
                $rootScope.$broadcast('zoom-image:loaded');


            }

            //scope.level =  isNaN(lvlCandidate) ? 1 : lvlCandidate;
            function initMark() {
                var imageContainerHeight;
                scope.markWidth = scope.imageContainerElemZoomed.clientWidth / origWidth * clip[0].clientWidth;


                imageContainerHeight = scope.imageContainerElemZoomed.clientWidth * (origHeight/origWidth);

                scope.markHeight = imageContainerHeight / origHeight * clip[0].clientHeight;
                //console.log('width x height', scope.imageContainerElemZoomed.clientWidth, origHeight / origWidth);

                mark.css('height', scope.markHeight + 'px')
                    .css('width', scope.markWidth + 'px');

                //console.log('markWidth x markHeight', scope.markWidth, scope.markHeight);
            }

            function onMouseMove(evt) {
                moveMarkRel(calculateOffsetRelative(evt));
            }

            clip.on('mouseenter', function (evt) {
                //console.log('enter');
                moveMarkRel(calculateOffsetRelative(evt));
                clip.on('mousemove', onMouseMove);
            });

            clip.on('mouseleave', function (evt) {
                //console.log('leave');
                clip.off('mousemove', onMouseMove);
            });

            function moveMarkRel(offsetRel) {

                var dx = scope.markWidth,
                    dy = scope.markHeight,
                    x = offsetRel.x * clip[0].clientWidth - dx *.5,
                    y = offsetRel.y * clip[0].clientHeight - dy * .5,
                    verti = clip[0].clientHeight / scope.markHeight,
                    hori =  clip[0].clientWidth / scope.markWidth;

                //console.log('moveMarkRel', offsetRel.y, clip[0].clientHeight, dy *.5);

                mark
                    .css('left', x + 'px')
                    .css('top',  y + 'px');

                $rootScope.$broadcast('mark:moved', [{x:offsetRel.x*(1+hori)-(hori *.5), y:offsetRel.y*(1+verti)-(verti *.5)}]);

            }

            function calculateOffsetRelative(mouseEvent) {

                markBoundingRect = mouseEvent.currentTarget.getBoundingClientRect();
                //console.log('calculateOffsetRelative',  mouseEvent.currentTarget, mouseEvent.clientX, markBoundingRect.left, mouseEvent.currentTarget.clientWidth);
                var relPos = {
                    x: (mouseEvent.clientX - markBoundingRect.left) / mouseEvent.currentTarget.clientWidth,
                    y: (mouseEvent.clientY - markBoundingRect.top) / mouseEvent.currentTarget.clientHeight
                };
                //console.log('calculateOffsetRelative', mouseEvent.clientY, markBoundingRect.top, mouseEvent.currentTarget.clientHeight, relPos);

                return relPos;
            }
        }

        return {
            restrict: 'A',
            require: '^zoom',
            scope: {},
            templateUrl: 'zoom-control.html',
            link: link
        };
    }]);

angular
    .module('imageZoom')
    .directive('zoomImageContainer', function () {

        function link(scope, element, attrs, ctrl) {

            var $ = angular.element,
                zoomed = $(element[0].querySelector('.zoom-image-container__clip')),
                zoomedImg = zoomed.find('img');

            scope.imageSrc = ctrl.getImageUrl();

            scope.$on('zoom-image:loaded', function(event) {
                var imageContainerHeight;

                scope.origDimensions = ctrl.getOrigDimensions();
                imageContainerHeight = zoomed[0].clientWidth * (scope.origDimensions.height/scope.origDimensions.width);
                //console.log('imageContainerHeight', imageContainerHeight);

                zoomed
                    .css('height', imageContainerHeight + 'px');

            });

            scope.$on('mark:moved', function (event, data) {
                updateZoomedRel.apply(this, data);
            });

            scope.$on('zoom-imagesrc:changed', function(evt, newSrc) {
                scope.imageSrc = newSrc;
            });

            function updateZoomedRel(offsetRel) {
                scope.$apply(function () {
                    zoomedImg
                        .css('left', ((zoomed[0].clientWidth - scope.origDimensions.width)  * (offsetRel.x )) + 'px')
                        .css('top',  ((zoomed[0].clientHeight - scope.origDimensions.height) * (offsetRel.y )) + 'px');
                });
            }

            attrs.$observe('ngSrc', function (data) {
                //console.log('update src', data, attrs.ngSrc);
                scope.imageSrc = attrs.ngSrc;
            }, true);

            attrs.$observe('level', function (data) {
                //console.log('update level', data);
                scope.level = data;
            }, true);
        }

        return {
            restrict: 'A',
            require: '^zoom',
            scope: {},
            templateUrl: 'zoom-image-container.html',
            link: link
        };
    });

angular
    .module('imageZoom')
    .directive('zoom', ['$rootScope', function ($rootScope) {


        function link(scope, element, attrs) {
            var $ = angular.element;
            scope.controlElem = $(element[0].querySelector('[zoom-control]'));
            scope.imageContainerElem = $(element[0].querySelector('[zoom-image-container]'));

            scope.$broadcast('zoom-control:found', scope.controlElem);
            scope.$broadcast('zoom-imagecontainer:found', scope.imageContainerElem);

            //console.log('zoomImageContainerElem', scope.imageContainerElem);

            attrs.$observe('zoomImagesrc', function (data) {
                //console.log('update src', data, attrs.zoom);
                scope.imageSrc = attrs.zoomImagesrc;
                $rootScope.$broadcast('zoom-imagesrc:changed', attrs.zoomImagesrc);
            }, true);

            attrs.$observe('level', function (data) {
                //console.log('update level', data);
                scope.level = data;
            }, true);

        }

        return {
            restrict: 'EA',
            scope: {
                imageSrc: '@zoomImagesrc'
            },
            link: link,
            controller: ['$scope', function($scope) {


                this.getImageUrl = function() {
                    return $scope.imageSrc;
                };

                this.getControlElem = function() {
                    return $scope.controlElem;
                };

                this.getImageContainerElem = function() {
                    return $scope.imageContainerElem;
                };

                this.setOrigDimensions = function(origWidth, origHeight) {
                    $scope.origWidth = origWidth;
                    $scope.origHeight = origHeight;
                };

                this.getOrigDimensions = function() {
                    return {
                        width: $scope.origWidth,
                        height: $scope.origHeight
                    };
                };
            }]
        };
    }]);

})(window, document, window.angular);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1vZHVsZS5qcyIsInRlbXBsYXRlcy5qcyIsImRpcmVjdGl2ZXMvem9vbS1jb250cm9sLmpzIiwiZGlyZWN0aXZlcy96b29tLWltYWdlLWNvbnRhaW5lci5qcyIsImRpcmVjdGl2ZXMvem9vbS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzVIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMzREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoibmdpbWFnZXpvb20uanMiLCJzb3VyY2VzQ29udGVudCI6WyJhbmd1bGFyLm1vZHVsZSgnaW1hZ2Vab29tJywgW10pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2ltYWdlWm9vbScpLnJ1bihbJyR0ZW1wbGF0ZUNhY2hlJywgZnVuY3Rpb24oJHRlbXBsYXRlQ2FjaGUpIHtcbiAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ3pvb20tY29udHJvbC5odG1sJywnPGRpdiBjbGFzcz1cXFwiem9vbS1jb250cm9sX19jbGlwXFxcIj5cXHJcXG4gICAgPGltZyBuZy1zcmM9XFxcInt7aW1hZ2VTcmN9fVxcXCIvPlxcclxcbiAgICA8ZGl2IGNsYXNzPVxcXCJtYXJrXFxcIj48L2Rpdj5cXHJcXG48L2Rpdj5cXHJcXG4nKTtcblxuICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnem9vbS1pbWFnZS1jb250YWluZXIuaHRtbCcsJzxkaXYgY2xhc3M9XFxcInpvb20taW1hZ2UtY29udGFpbmVyX19jbGlwXFxcIj5cXHJcXG4gICAgPGltZyBuZy1zcmM9XFxcInt7aW1hZ2VTcmN9fVxcXCIvPlxcclxcbjwvZGl2PlxcclxcbicpO1xufV0pO1xuIiwiYW5ndWxhclxuICAgIC5tb2R1bGUoJ2ltYWdlWm9vbScpXG4gICAgLmRpcmVjdGl2ZSgnem9vbUNvbnRyb2wnLCBbJyRyb290U2NvcGUnLCBmdW5jdGlvbiAoJHJvb3RTY29wZSkge1xuXG4gICAgICAgIGZ1bmN0aW9uIGxpbmsoc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBjdHJsKSB7XG5cbiAgICAgICAgICAgIHZhciAkID0gYW5ndWxhci5lbGVtZW50LFxuICAgICAgICAgICAgICAgIGNsaXAgPSAkKGVsZW1lbnRbMF0ucXVlcnlTZWxlY3RvcignLnpvb20tY29udHJvbF9fY2xpcCcpKSxcbiAgICAgICAgICAgICAgICBpbWFnZSA9IGNsaXAuZmluZCgnaW1nJyksXG4gICAgICAgICAgICAgICAgbWFyayA9ICQoY2xpcFswXS5xdWVyeVNlbGVjdG9yKCcubWFyaycpKSxcbiAgICAgICAgICAgICAgICBvcmlnV2lkdGggPSBpbWFnZVswXS5uYXR1cmFsV2lkdGgsXG4gICAgICAgICAgICAgICAgb3JpZ0hlaWdodCA9IGltYWdlWzBdLm5hdHVyYWxIZWlnaHQsXG4gICAgICAgICAgICAgICAgbWFya0JvdW5kaW5nUmVjdCA9IG1hcmtbMF0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cblxuXG4gICAgICAgICAgICBzY29wZS5pbWFnZVNyYyA9IGN0cmwuZ2V0SW1hZ2VVcmwoKTtcbiAgICAgICAgICAgIHNjb3BlLmltYWdlQ29udGFpbmVyRWxlbSA9IGN0cmwuZ2V0SW1hZ2VDb250YWluZXJFbGVtKCk7XG4gICAgICAgICAgICBzY29wZS5pbWFnZUNvbnRhaW5lckVsZW1ab29tZWQgPSBzY29wZS5pbWFnZUNvbnRhaW5lckVsZW1bMF0ucXVlcnlTZWxlY3RvcignLnpvb20taW1hZ2UtY29udGFpbmVyX19jbGlwJyk7XG5cblxuICAgICAgICAgICAgc2NvcGUuJG9uKCd6b29tLWltYWdlc3JjOmNoYW5nZWQnLCBmdW5jdGlvbihldnQsIG5ld1NyYykge1xuICAgICAgICAgICAgICAgIHNjb3BlLmltYWdlU3JjID0gbmV3U3JjO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGlmICghb3JpZ1dpZHRoIHx8ICFvcmlnSGVpZ2h0KSB7XG4gICAgICAgICAgICAgICAgaW1hZ2VbMF0uYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsIG9uSW1hZ2VMb2FkZWQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmdW5jdGlvbiBvbkltYWdlTG9hZGVkKGV2dCkge1xuXG4gICAgICAgICAgICAgICAgb3JpZ1dpZHRoID0gaW1hZ2VbMF0ubmF0dXJhbFdpZHRoO1xuICAgICAgICAgICAgICAgIG9yaWdIZWlnaHQgPSBpbWFnZVswXS5uYXR1cmFsSGVpZ2h0O1xuICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ2xvYWRlZCcsIGV2dC5jdXJyZW50VGFyZ2V0LCBvcmlnV2lkdGgsIG9yaWdIZWlnaHQpO1xuXG4gICAgICAgICAgICAgICAgY3RybC5zZXRPcmlnRGltZW5zaW9ucyhvcmlnV2lkdGgsIG9yaWdIZWlnaHQpO1xuXG4gICAgICAgICAgICAgICAgaWYoc2NvcGUuaW1hZ2VDb250YWluZXJFbGVtICYmIHNjb3BlLmltYWdlQ29udGFpbmVyRWxlbS5sZW5ndGggPiAwKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYoc2NvcGUuaW1hZ2VDb250YWluZXJFbGVtWm9vbWVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbml0TWFyaygpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuJG9uKCd6b29tLWltYWdlY29udGFpbmVyOmZvdW5kJywgaW5pdE1hcmsoKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoJ3pvb20taW1hZ2U6bG9hZGVkJyk7XG5cblxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvL3Njb3BlLmxldmVsID0gIGlzTmFOKGx2bENhbmRpZGF0ZSkgPyAxIDogbHZsQ2FuZGlkYXRlO1xuICAgICAgICAgICAgZnVuY3Rpb24gaW5pdE1hcmsoKSB7XG4gICAgICAgICAgICAgICAgdmFyIGltYWdlQ29udGFpbmVySGVpZ2h0O1xuICAgICAgICAgICAgICAgIHNjb3BlLm1hcmtXaWR0aCA9IHNjb3BlLmltYWdlQ29udGFpbmVyRWxlbVpvb21lZC5jbGllbnRXaWR0aCAvIG9yaWdXaWR0aCAqIGNsaXBbMF0uY2xpZW50V2lkdGg7XG5cblxuICAgICAgICAgICAgICAgIGltYWdlQ29udGFpbmVySGVpZ2h0ID0gc2NvcGUuaW1hZ2VDb250YWluZXJFbGVtWm9vbWVkLmNsaWVudFdpZHRoICogKG9yaWdIZWlnaHQvb3JpZ1dpZHRoKTtcblxuICAgICAgICAgICAgICAgIHNjb3BlLm1hcmtIZWlnaHQgPSBpbWFnZUNvbnRhaW5lckhlaWdodCAvIG9yaWdIZWlnaHQgKiBjbGlwWzBdLmNsaWVudEhlaWdodDtcbiAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKCd3aWR0aCB4IGhlaWdodCcsIHNjb3BlLmltYWdlQ29udGFpbmVyRWxlbVpvb21lZC5jbGllbnRXaWR0aCwgb3JpZ0hlaWdodCAvIG9yaWdXaWR0aCk7XG5cbiAgICAgICAgICAgICAgICBtYXJrLmNzcygnaGVpZ2h0Jywgc2NvcGUubWFya0hlaWdodCArICdweCcpXG4gICAgICAgICAgICAgICAgICAgIC5jc3MoJ3dpZHRoJywgc2NvcGUubWFya1dpZHRoICsgJ3B4Jyk7XG5cbiAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKCdtYXJrV2lkdGggeCBtYXJrSGVpZ2h0Jywgc2NvcGUubWFya1dpZHRoLCBzY29wZS5tYXJrSGVpZ2h0KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZnVuY3Rpb24gb25Nb3VzZU1vdmUoZXZ0KSB7XG4gICAgICAgICAgICAgICAgbW92ZU1hcmtSZWwoY2FsY3VsYXRlT2Zmc2V0UmVsYXRpdmUoZXZ0KSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNsaXAub24oJ21vdXNlZW50ZXInLCBmdW5jdGlvbiAoZXZ0KSB7XG4gICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnZW50ZXInKTtcbiAgICAgICAgICAgICAgICBtb3ZlTWFya1JlbChjYWxjdWxhdGVPZmZzZXRSZWxhdGl2ZShldnQpKTtcbiAgICAgICAgICAgICAgICBjbGlwLm9uKCdtb3VzZW1vdmUnLCBvbk1vdXNlTW92ZSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgY2xpcC5vbignbW91c2VsZWF2ZScsIGZ1bmN0aW9uIChldnQpIHtcbiAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKCdsZWF2ZScpO1xuICAgICAgICAgICAgICAgIGNsaXAub2ZmKCdtb3VzZW1vdmUnLCBvbk1vdXNlTW92ZSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgZnVuY3Rpb24gbW92ZU1hcmtSZWwob2Zmc2V0UmVsKSB7XG5cbiAgICAgICAgICAgICAgICB2YXIgZHggPSBzY29wZS5tYXJrV2lkdGgsXG4gICAgICAgICAgICAgICAgICAgIGR5ID0gc2NvcGUubWFya0hlaWdodCxcbiAgICAgICAgICAgICAgICAgICAgeCA9IG9mZnNldFJlbC54ICogY2xpcFswXS5jbGllbnRXaWR0aCAtIGR4ICouNSxcbiAgICAgICAgICAgICAgICAgICAgeSA9IG9mZnNldFJlbC55ICogY2xpcFswXS5jbGllbnRIZWlnaHQgLSBkeSAqIC41LFxuICAgICAgICAgICAgICAgICAgICB2ZXJ0aSA9IGNsaXBbMF0uY2xpZW50SGVpZ2h0IC8gc2NvcGUubWFya0hlaWdodCxcbiAgICAgICAgICAgICAgICAgICAgaG9yaSA9ICBjbGlwWzBdLmNsaWVudFdpZHRoIC8gc2NvcGUubWFya1dpZHRoO1xuXG4gICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnbW92ZU1hcmtSZWwnLCBvZmZzZXRSZWwueSwgY2xpcFswXS5jbGllbnRIZWlnaHQsIGR5ICouNSk7XG5cbiAgICAgICAgICAgICAgICBtYXJrXG4gICAgICAgICAgICAgICAgICAgIC5jc3MoJ2xlZnQnLCB4ICsgJ3B4JylcbiAgICAgICAgICAgICAgICAgICAgLmNzcygndG9wJywgIHkgKyAncHgnKTtcblxuICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdCgnbWFyazptb3ZlZCcsIFt7eDpvZmZzZXRSZWwueCooMStob3JpKS0oaG9yaSAqLjUpLCB5Om9mZnNldFJlbC55KigxK3ZlcnRpKS0odmVydGkgKi41KX1dKTtcblxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmdW5jdGlvbiBjYWxjdWxhdGVPZmZzZXRSZWxhdGl2ZShtb3VzZUV2ZW50KSB7XG5cbiAgICAgICAgICAgICAgICBtYXJrQm91bmRpbmdSZWN0ID0gbW91c2VFdmVudC5jdXJyZW50VGFyZ2V0LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ2NhbGN1bGF0ZU9mZnNldFJlbGF0aXZlJywgIG1vdXNlRXZlbnQuY3VycmVudFRhcmdldCwgbW91c2VFdmVudC5jbGllbnRYLCBtYXJrQm91bmRpbmdSZWN0LmxlZnQsIG1vdXNlRXZlbnQuY3VycmVudFRhcmdldC5jbGllbnRXaWR0aCk7XG4gICAgICAgICAgICAgICAgdmFyIHJlbFBvcyA9IHtcbiAgICAgICAgICAgICAgICAgICAgeDogKG1vdXNlRXZlbnQuY2xpZW50WCAtIG1hcmtCb3VuZGluZ1JlY3QubGVmdCkgLyBtb3VzZUV2ZW50LmN1cnJlbnRUYXJnZXQuY2xpZW50V2lkdGgsXG4gICAgICAgICAgICAgICAgICAgIHk6IChtb3VzZUV2ZW50LmNsaWVudFkgLSBtYXJrQm91bmRpbmdSZWN0LnRvcCkgLyBtb3VzZUV2ZW50LmN1cnJlbnRUYXJnZXQuY2xpZW50SGVpZ2h0XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKCdjYWxjdWxhdGVPZmZzZXRSZWxhdGl2ZScsIG1vdXNlRXZlbnQuY2xpZW50WSwgbWFya0JvdW5kaW5nUmVjdC50b3AsIG1vdXNlRXZlbnQuY3VycmVudFRhcmdldC5jbGllbnRIZWlnaHQsIHJlbFBvcyk7XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gcmVsUG9zO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnQScsXG4gICAgICAgICAgICByZXF1aXJlOiAnXnpvb20nLFxuICAgICAgICAgICAgc2NvcGU6IHt9LFxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICd6b29tLWNvbnRyb2wuaHRtbCcsXG4gICAgICAgICAgICBsaW5rOiBsaW5rXG4gICAgICAgIH07XG4gICAgfV0pO1xuIiwiYW5ndWxhclxuICAgIC5tb2R1bGUoJ2ltYWdlWm9vbScpXG4gICAgLmRpcmVjdGl2ZSgnem9vbUltYWdlQ29udGFpbmVyJywgZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIGZ1bmN0aW9uIGxpbmsoc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBjdHJsKSB7XG5cbiAgICAgICAgICAgIHZhciAkID0gYW5ndWxhci5lbGVtZW50LFxuICAgICAgICAgICAgICAgIHpvb21lZCA9ICQoZWxlbWVudFswXS5xdWVyeVNlbGVjdG9yKCcuem9vbS1pbWFnZS1jb250YWluZXJfX2NsaXAnKSksXG4gICAgICAgICAgICAgICAgem9vbWVkSW1nID0gem9vbWVkLmZpbmQoJ2ltZycpO1xuXG4gICAgICAgICAgICBzY29wZS5pbWFnZVNyYyA9IGN0cmwuZ2V0SW1hZ2VVcmwoKTtcblxuICAgICAgICAgICAgc2NvcGUuJG9uKCd6b29tLWltYWdlOmxvYWRlZCcsIGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgdmFyIGltYWdlQ29udGFpbmVySGVpZ2h0O1xuXG4gICAgICAgICAgICAgICAgc2NvcGUub3JpZ0RpbWVuc2lvbnMgPSBjdHJsLmdldE9yaWdEaW1lbnNpb25zKCk7XG4gICAgICAgICAgICAgICAgaW1hZ2VDb250YWluZXJIZWlnaHQgPSB6b29tZWRbMF0uY2xpZW50V2lkdGggKiAoc2NvcGUub3JpZ0RpbWVuc2lvbnMuaGVpZ2h0L3Njb3BlLm9yaWdEaW1lbnNpb25zLndpZHRoKTtcbiAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKCdpbWFnZUNvbnRhaW5lckhlaWdodCcsIGltYWdlQ29udGFpbmVySGVpZ2h0KTtcblxuICAgICAgICAgICAgICAgIHpvb21lZFxuICAgICAgICAgICAgICAgICAgICAuY3NzKCdoZWlnaHQnLCBpbWFnZUNvbnRhaW5lckhlaWdodCArICdweCcpO1xuXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgc2NvcGUuJG9uKCdtYXJrOm1vdmVkJywgZnVuY3Rpb24gKGV2ZW50LCBkYXRhKSB7XG4gICAgICAgICAgICAgICAgdXBkYXRlWm9vbWVkUmVsLmFwcGx5KHRoaXMsIGRhdGEpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHNjb3BlLiRvbignem9vbS1pbWFnZXNyYzpjaGFuZ2VkJywgZnVuY3Rpb24oZXZ0LCBuZXdTcmMpIHtcbiAgICAgICAgICAgICAgICBzY29wZS5pbWFnZVNyYyA9IG5ld1NyYztcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBmdW5jdGlvbiB1cGRhdGVab29tZWRSZWwob2Zmc2V0UmVsKSB7XG4gICAgICAgICAgICAgICAgc2NvcGUuJGFwcGx5KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgem9vbWVkSW1nXG4gICAgICAgICAgICAgICAgICAgICAgICAuY3NzKCdsZWZ0JywgKCh6b29tZWRbMF0uY2xpZW50V2lkdGggLSBzY29wZS5vcmlnRGltZW5zaW9ucy53aWR0aCkgICogKG9mZnNldFJlbC54ICkpICsgJ3B4JylcbiAgICAgICAgICAgICAgICAgICAgICAgIC5jc3MoJ3RvcCcsICAoKHpvb21lZFswXS5jbGllbnRIZWlnaHQgLSBzY29wZS5vcmlnRGltZW5zaW9ucy5oZWlnaHQpICogKG9mZnNldFJlbC55ICkpICsgJ3B4Jyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGF0dHJzLiRvYnNlcnZlKCduZ1NyYycsIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZygndXBkYXRlIHNyYycsIGRhdGEsIGF0dHJzLm5nU3JjKTtcbiAgICAgICAgICAgICAgICBzY29wZS5pbWFnZVNyYyA9IGF0dHJzLm5nU3JjO1xuICAgICAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgICAgIGF0dHJzLiRvYnNlcnZlKCdsZXZlbCcsIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZygndXBkYXRlIGxldmVsJywgZGF0YSk7XG4gICAgICAgICAgICAgICAgc2NvcGUubGV2ZWwgPSBkYXRhO1xuICAgICAgICAgICAgfSwgdHJ1ZSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcbiAgICAgICAgICAgIHJlcXVpcmU6ICdeem9vbScsXG4gICAgICAgICAgICBzY29wZToge30sXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ3pvb20taW1hZ2UtY29udGFpbmVyLmh0bWwnLFxuICAgICAgICAgICAgbGluazogbGlua1xuICAgICAgICB9O1xuICAgIH0pO1xuIiwiYW5ndWxhclxuICAgIC5tb2R1bGUoJ2ltYWdlWm9vbScpXG4gICAgLmRpcmVjdGl2ZSgnem9vbScsIFsnJHJvb3RTY29wZScsIGZ1bmN0aW9uICgkcm9vdFNjb3BlKSB7XG5cblxuICAgICAgICBmdW5jdGlvbiBsaW5rKHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xuICAgICAgICAgICAgdmFyICQgPSBhbmd1bGFyLmVsZW1lbnQ7XG4gICAgICAgICAgICBzY29wZS5jb250cm9sRWxlbSA9ICQoZWxlbWVudFswXS5xdWVyeVNlbGVjdG9yKCdbem9vbS1jb250cm9sXScpKTtcbiAgICAgICAgICAgIHNjb3BlLmltYWdlQ29udGFpbmVyRWxlbSA9ICQoZWxlbWVudFswXS5xdWVyeVNlbGVjdG9yKCdbem9vbS1pbWFnZS1jb250YWluZXJdJykpO1xuXG4gICAgICAgICAgICBzY29wZS4kYnJvYWRjYXN0KCd6b29tLWNvbnRyb2w6Zm91bmQnLCBzY29wZS5jb250cm9sRWxlbSk7XG4gICAgICAgICAgICBzY29wZS4kYnJvYWRjYXN0KCd6b29tLWltYWdlY29udGFpbmVyOmZvdW5kJywgc2NvcGUuaW1hZ2VDb250YWluZXJFbGVtKTtcblxuICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnem9vbUltYWdlQ29udGFpbmVyRWxlbScsIHNjb3BlLmltYWdlQ29udGFpbmVyRWxlbSk7XG5cbiAgICAgICAgICAgIGF0dHJzLiRvYnNlcnZlKCd6b29tSW1hZ2VzcmMnLCBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ3VwZGF0ZSBzcmMnLCBkYXRhLCBhdHRycy56b29tKTtcbiAgICAgICAgICAgICAgICBzY29wZS5pbWFnZVNyYyA9IGF0dHJzLnpvb21JbWFnZXNyYztcbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoJ3pvb20taW1hZ2VzcmM6Y2hhbmdlZCcsIGF0dHJzLnpvb21JbWFnZXNyYyk7XG4gICAgICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICAgICAgYXR0cnMuJG9ic2VydmUoJ2xldmVsJywgZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKCd1cGRhdGUgbGV2ZWwnLCBkYXRhKTtcbiAgICAgICAgICAgICAgICBzY29wZS5sZXZlbCA9IGRhdGE7XG4gICAgICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnRUEnLFxuICAgICAgICAgICAgc2NvcGU6IHtcbiAgICAgICAgICAgICAgICBpbWFnZVNyYzogJ0B6b29tSW1hZ2VzcmMnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbGluazogbGluayxcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6IFsnJHNjb3BlJywgZnVuY3Rpb24oJHNjb3BlKSB7XG5cblxuICAgICAgICAgICAgICAgIHRoaXMuZ2V0SW1hZ2VVcmwgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRzY29wZS5pbWFnZVNyYztcbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgdGhpcy5nZXRDb250cm9sRWxlbSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJHNjb3BlLmNvbnRyb2xFbGVtO1xuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICB0aGlzLmdldEltYWdlQ29udGFpbmVyRWxlbSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJHNjb3BlLmltYWdlQ29udGFpbmVyRWxlbTtcbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgdGhpcy5zZXRPcmlnRGltZW5zaW9ucyA9IGZ1bmN0aW9uKG9yaWdXaWR0aCwgb3JpZ0hlaWdodCkge1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUub3JpZ1dpZHRoID0gb3JpZ1dpZHRoO1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUub3JpZ0hlaWdodCA9IG9yaWdIZWlnaHQ7XG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIHRoaXMuZ2V0T3JpZ0RpbWVuc2lvbnMgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoOiAkc2NvcGUub3JpZ1dpZHRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiAkc2NvcGUub3JpZ0hlaWdodFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XVxuICAgICAgICB9O1xuICAgIH1dKTtcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==