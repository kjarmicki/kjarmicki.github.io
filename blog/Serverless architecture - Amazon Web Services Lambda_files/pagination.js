(function ($) {
    $(document).on('click', '#pagination a', function (e) {
        e.preventDefault();

        var link = $(this).attr('href');

        $('#append-content').load(link + ' #content > *', function () {
            $(this).find('.content-menu').remove();
            $(this).children(':first').unwrap();
        });
    });
})(jQuery);
