angular
    .module('imageZoomDemo', ['imageZoom'])
    .controller('ImageZoomController', ['$sce', function ($sce) {

        this.images = [
            {
                name: 'Duck.jpg',
                url: './img/duck.jpg'
            },
            {
                name: 'Moon.jpg',
                url: './img/moon.jpg'
            }
        ];

        this.zoomLvl = 2;
        this.src = this.images[0].url;

        this.addImage = function () {
            this.url = $sce.trustAsResourceUrl(this.url);

            this.images.push({
                name: this.name,
                url: this.url
            });

            this.name = '';
            this.url = '';
        }
    }]);

