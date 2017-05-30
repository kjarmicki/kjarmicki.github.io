(function ($) {
    $(document).on('click', '.management-member', function (e) {
        if ($(this).hasClass('selected')) {
            $(this).removeClass('selected');
            return;
        }

        $('.management-member').removeClass('selected');
        $(this).addClass('selected');
    });
})(jQuery);
