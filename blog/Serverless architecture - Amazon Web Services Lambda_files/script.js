function showOverlay(url) {
    el = document.getElementById('overlay');
    el.style.visibility = (el.style.visibility == 'visible') ? 'hidden' : 'visible';
    var iframe;
    iframe = document.createElement('iframe');
    var dialog = document.getElementById('overlay-body');
    iframe.src = url;
    iframe.setAttribute('id', 'schibsted-video');
    iframe.style.display = 'block';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.style.position = 'relative';
    iframe.style.zIndex = '50';
    dialog.appendChild(iframe);
}

function hideOverlay() {
    el = document.getElementById('overlay');
    el.style.visibility = (el.style.visibility == 'visible') ? 'hidden' : 'visible';
    var dialog = document.getElementById('overlay-body');
    var elem = document.getElementById('schibsted-video');
    elem.parentNode.removeChild(elem);
}

function changeValue(val) {

}

(function ($) {
    jQuery('.faq-title').click(function () {
        jQuery(this).next().slideToggle();
    });

    var data = JSON.parse(jobPositions);
    var ms = jQuery('#job-positions').tagSuggest({
            data: data,
            maxDropHeight: 200,
            editable: false,
            emptyText: 'Choose job positions'
        }),
        links = jQuery('#job-links').tagSuggest({
            useTabKey: true,
            useCommaKey: true,
            emptyText: 'Links you like us to see (Linkedin, Github, etc.)',
            maxSelection: 10,
            maxSelectionRenderer: function (v) {
                return 'Max 10 links';
            }
        });

    window.openSchibstedPlModal = function (id, job) {
        var modal = document.getElementById(id);
        var close = document.getElementsByClassName('close')[0];
        var submitBtn = document.querySelector('.submit-btn');

        if (job) {
            ms.setValue([job]);
        }

        modal.style.display = 'flex';
        document.documentElement.style.overflow = 'hidden';


        close.onclick = function () {
            modal.style.display = 'none';
            document.documentElement.style.overflow = 'auto';
            window.removeEventListener('click', function () {
            });
            submitBtn.removeEventListener('click', function () {
            })
        };

        window.addEventListener('click', function (event) {
            if (event.target == modal) {
                document.documentElement.style.overflow = 'auto';
                modal.style.display = 'none';
            }
        });

        function changeValue(inputVal, valuesArray) {
            var value = '';
            if (valuesArray.length == 0) {
                inputVal.value = '';
            } else {
                valuesArray.forEach(function (val, key) {
                    value = (value ? value + ", " + val : val);
                })
            }
            inputVal.value = value;
            console.log(value)
        }

        submitBtn.addEventListener('click', function (e) {
            var jobPositions = document.querySelector('#job-positions input[type=hidden]'),
                jobLinks = document.querySelector('#job-links input[type=hidden]'),
                positionsValuesArray = ms.getValue(),
                linksValuesArray = links.getValue();

            changeValue(jobPositions, positionsValuesArray);
            changeValue(jobLinks, linksValuesArray);
        })
    }
})(jQuery);
