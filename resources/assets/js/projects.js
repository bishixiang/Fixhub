var app = app || {};

(function ($) {
    $('.repo-refresh').on('click', function (event) {
        console.log('hello,repo refresh.');
    });

    $('select.deployment-source').select2({
        width: '100%',
        minimumResultsForSearch: 6
    });

    $('.deployment-source:radio').on('change', function (event) {
        var target = $(event.currentTarget);

        $('div.deployment-source-container').hide();
        if (target.val() === 'branch') {
            $('#deployment_branch').parent('div').show();
        } else if (target.val() === 'tag') {
            $('#deployment_tag').parent('div').show();
        }
    });

    $('#reason').on('show.bs.modal', function (event) {
        var modal = $(this);
        $('.callout-danger', modal).hide();
    });

    $('#reason button.btn-save').on('click', function (event) {
        var target = $(event.currentTarget);
        var icon = target.find('i');
        var dialog = target.parents('.modal');
        var source = $('input[name=source]:checked').val();

        $('.has-error', source).removeClass('has-error');

        if (source === 'branch' || source === 'tag') {
            if ($('#deployment_' + source).val() === '') {
                $('#deployment_' + source).parentsUntil('div').addClass('has-error');

                $('.callout-danger', dialog).show();
                event.stopPropagation();
                return;
            }
        }

        icon.addClass('ion-refresh fixhub-spin');
        $('button.close', dialog).hide();
    });

   // FIXME: This seems very wrong
    $('#project').on('show.bs.modal', function (event) {
        var button = $(event.relatedTarget);
        var modal = $(this);
        var title = trans('projects.create');

        $('.btn-danger', modal).hide();
        $('.callout-danger', modal).hide();
        $('.has-error', modal).removeClass('has-error');
        $('.label-danger', modal).remove();
        $('#template-list', modal).hide();

        $('.nav-tabs a:first', modal).tab('show');

        if (button.hasClass('btn-edit')) {
            title = trans('projects.edit');
            $('.btn-danger', modal).show();
        } else {
            $('#template-list', modal).show();
            $('#project_id').val('');
            $('#project_name').val('');
            $('#project_repository').val('');
            $('#project_branch').val('master');
            $('#project_group_id').val($("#project_group_id option:first").val());
            $('#project_key_id').val($("#project_key_id option:first").val());
            $('#project_builds_to_keep').val(10);
            $('#project_url').val('');
            $('#project_build_url').val('');
            $('#project_allow_other_branch').prop('checked', true);
            $('#project_include_dev').prop('checked', false);
            $('#project_private_key').val('');
        }

        modal.find('.modal-title span').text(title);
    });

    // FIXME: This seems very wrong
    $('body').delegate('.project-trash button.btn-delete','click', function (event) {
        var target = $(event.currentTarget);
        var icon = target.find('i');
        var dialog = target.parents('.modal');

        icon.addClass('ion-refresh fixhub-spin');
        dialog.find('input').attr('disabled', 'disabled');
        $('button.close', dialog).hide();

        var project = app.Projects.get($('#model_id').val());

        project.destroy({
            wait: true,
            success: function(model, response, options) {
                dialog.modal('hide');
                $('.callout-danger', dialog).hide();

                icon.removeClass('ion-refresh fixhub-spin');
                $('button.close', dialog).show();
                dialog.find('input').removeAttr('disabled');
            },
            error: function() {
                icon.removeClass('ion-refresh fixhub-spin');
                $('button.close', dialog).show();
                dialog.find('input').removeAttr('disabled');
            }
        });
    });

    // FIXME: This seems very wrong
    $('#project button.btn-save').on('click', function (event) {
        var target = $(event.currentTarget);
        var icon = target.find('i');
        var dialog = target.parents('.modal');

        icon.addClass('ion-refresh fixhub-spin');
        dialog.find('input').attr('disabled', 'disabled');
        $('button.close', dialog).hide();

        var project_id = $('#project_id').val();

        if (project_id) {
            var project = app.Projects.get(project_id);
        } else {
            var project = new app.Project();
        }

        project.save({
            name:               $('#project_name').val(),
            repository:         $('#project_repository').val(),
            branch:             $('#project_branch').val(),
            group_id:           $('#project_group_id').val(),
            key_id:             $('#project_key_id').val(),
            builds_to_keep:     $('#project_builds_to_keep').val(),
            url:                $('#project_url').val(),
            build_url:          $('#project_build_url').val(),
            template_id:        $('#project_template_id') ? $('#project_template_id').val() : null,
            allow_other_branch: $('#project_allow_other_branch').is(':checked'),
            include_dev:        $('#project_include_dev').is(':checked'),
            private_key:        $('#project_private_key').val()
        }, {
            wait: true,
            success: function(model, response, options) {
                dialog.modal('hide');
                $('.callout-danger', dialog).hide();

                icon.removeClass('ion-refresh fixhub-spin');
                $('button.close', dialog).show();
                dialog.find('input').removeAttr('disabled');

                if (!project_id) {
                    app.Projects.add(response);
                }
            },
            error: function(model, response, options) {
                $('.callout-danger', dialog).show();

                var errors = response.responseJSON;

                $('.has-error', dialog).removeClass('has-error');
                $('.label-danger', dialog).remove();

                $('form :input', dialog).each(function (index, element) {
                    element = $(element);

                    var name = element.attr('name');

                    if (typeof errors[name] !== 'undefined') {
                        var parent = element.parent('div');
                        parent.addClass('has-error');
                        parent.append($('<span>').attr('class', 'label label-danger').text(errors[name]));
                    }

                });

                icon.removeClass('ion-refresh fixhub-spin');
                $('button.close', dialog).show();
                dialog.find('input').removeAttr('disabled');
            }
        });
    });

    app.Project = Backbone.Model.extend({
        urlRoot: '/admin/projects'
    });

    var Projects = Backbone.Collection.extend({
        model: app.Project
    });

    app.Projects = new Projects();

    app.ProjectsTab = Backbone.View.extend({
        el: '#app',
        events: {

        },
        initialize: function() {
            this.$list = $('#project_list tbody');

            $('#project_list').hide();
            $('#no_projects').show();

            this.listenTo(app.Projects, 'add', this.addOne);
            this.listenTo(app.Projects, 'reset', this.addAll);
            this.listenTo(app.Projects, 'remove', this.addAll);
            this.listenTo(app.Projects, 'all', this.render);

            app.listener.on('project:Fixhub\\Bus\\Events\\ModelChanged', function (data) {
                var project = app.Projects.get(parseInt(data.model.id));

                if (project) {
                    project.set(data.model);
                }
            });

            app.listener.on('project:Fixhub\\Bus\\Events\\ModelCreated', function (data) {
                app.Projects.add(data.model);
            });

            app.listener.on('project:Fixhub\\Bus\\Events\\ModelTrashed', function (data) {
                var project = app.Projects.get(parseInt(data.model.id));

                if (project) {
                    app.Projects.remove(project);
                }

                $('#project_' + data.model.id).parent('li').remove();

                if (parseInt(data.model.id) === parseInt(app.project_id)) {
                    window.location.href = '/';
                }
            });
        },
        render: function () {
            if (app.Projects.length) {
                $('#no_projects').hide();
                $('#project_list').show();
            } else {
                $('#no_projects').show();
                $('#project_list').hide();
            }
        },
        addOne: function (project) {
            var view = new app.ProjectView({
                model: project
            });

            this.$list.append(view.render().el);
        },
        addAll: function () {
            this.$list.html('');
            app.Projects.each(this.addOne, this);
        }
    });

    app.ProjectView = Backbone.View.extend({
        tagName:  'tr',
        events: {
            'click .btn-edit': 'editProject',
            'click .btn-trash': 'trashProject'
        },
        initialize: function () {
            this.listenTo(this.model, 'change', this.render);
            this.listenTo(this.model, 'destroy', this.remove);

            this.template = _.template($('#project-template').html());
        },
        render: function () {
            var data = this.model.toJSON();

            data.deploy = data.last_run ? moment(data.last_run).format('YYYY-MM-DD HH:mm:ss') : false;

            this.$el.html(this.template(data));

            return this;
        },
        editProject: function() {
            $('#project_id').val(this.model.id);
            $('#project_name').val(this.model.get('name'));
            $('#project_repository').val(this.model.get('repository'));
            $('#project_branch').val(this.model.get('branch'));
            $('#project_group_id').val(this.model.get('group_id'));
            $('#project_key_id').val(this.model.get('key_id'));
            $('#project_builds_to_keep').val(this.model.get('builds_to_keep'));
            $('#project_url').val(this.model.get('url'));
            $('#project_build_url').val(this.model.get('build_url'));
            $('#project_allow_other_branch').prop('checked', (this.model.get('allow_other_branch') === true));
            $('#project_include_dev').prop('checked', (this.model.get('include_dev') === true));
            $('#project_private_key').val('');
        },
        trashProject: function() {
            var target = $('#model_id');
            target.val(this.model.id);
            target.parents('.modal').removeClass().addClass('modal fade project-trash');
        }
    });

    $('#new_webhook').on('click', function(event) {
        var target = $(event.currentTarget);
        var project_id = target.data('project-id');
        var icon = $('i', target);

        if ($('.fixhub-spin', target).length > 0) {
            return;
        }

        target.attr('disabled', 'disabled');

        icon.addClass('fixhub-spin');

        $.ajax({
            type: 'GET',
            url: '/webhook/' + project_id + '/refresh'
        }).fail(function (response) {

        }).done(function (data) {
            $('#webhook').html(data.url);
        }).always(function () {
            icon.removeClass('fixhub-spin');
            target.removeAttr('disabled');
        });
    });
})(jQuery);
