var loaded_config_array = new Array();
var violations_array = new Array();

// Generic load JSON function
function load_aws_config_from_json(list, keyword, cols) {
    var id1 = '#' + keyword + '-list-template';
    var id2 = keyword + 's-list';
    var tmp = Handlebars.compile($(id1).html());
    document.getElementById(id2).innerHTML = tmp({items: list});
    if (cols >= 2) {
        var id3 = '#' + keyword + '-detail-template';
        var id4 = keyword + 's-details';
        var tmp = Handlebars.compile($(id3).html());
        document.getElementById(id4).innerHTML = tmp({items: list});
    }
}

// Generic highlight finding function
function highlight_violations(violations, keyword) {
    for (i in violations) {
        var read_macro_items = false;
        var vkey = violations[i]['keyword_prefix'] + '_' + violations[i]['entity'].split('.').pop() + '-' + i;
        violations_array[vkey] = new Array();
        if (violations[i]['macro_items'].length == violations[i]['items'].length ) {
            read_macro_items = true;
        }
        for (j in violations[i]['items']) {
            var id = vkey;
            if (read_macro_items) {
                id = id + '-' + violations[i]['macro_items'][j];
            }
            id = id + '-' + violations[i]['items'][j];
            if ($('[id$="' + id + '"]').hasClass("badge")) {
                $('[id$="' + id + '"]').addClass('btn-' + violations[i]['level']);
            } else {
                $('[id$="' + id + '"]').addClass('finding-' + violations[i]['level']);
            }
            if (read_macro_items) {
                violations_array[vkey].push(violations[i]['macro_items'][j]);
            } else {
                violations_array[vkey].push(violations[i]['items'][j]);
            }
        }
    }
    load_aws_config_from_json(violations, keyword + '_violation', 1);
}

// Generic list filters
function load_filters_from_json(list) {
    var id1 = '#filter-list-template';
    var id2 = '#filters-list';
    var compiler = Handlebars.compile($(id1).html());
    $(id2).append(compiler({items: list}));
}
function load_region_filters(keyword, list) {
    var id1 = '#region-filter-list-template';
    var id2 = '#region-filters-list';
    var compiler = Handlebars.compile($(id1).html());
    $(id2).append(compiler({items: list, keyword: keyword}));
    $('[id="' + keyword  + '_region-filter-select_all"]').hide();
}

// Display functions
function hideAll() {
    $("[id$='-row']").hide();
    $("[id*='-details-']").hide();
    $("[id*='-filter-']").hide();
}
function hideRowItems(keyword) {
    $("[id*='" + keyword + "-list']").hide();
    $("[id*='" + keyword + "-details']").hide();
}
function showEmptyRow(keyword) {
    id = '[id*="' + prefix + '_region-"]';
    $(id).show();
    id = "#" + keyword + "s-row";
    $(id).show();
    hideRowItems(keyword);
}
function showItem(keyword, id) {
    var id1 = '[id="' + keyword + '-list-' + id + '"]';
    var id2 = '[id="' + keyword + '-details-' + id+ '"]';
    $(id1).show();
    $(id2).show();
}
function hideItem(keyword, id) {
    var id1 = '[id="' + keyword + '-list-' + id + '"]';
    var id2 = '[id="' + keyword + '-details-' + id+ '"]';
    $(id1).hide();
    $(id2).hide();
}
function showRow(keyword) {
    id = '[id*="' + prefix + '_region-"]';
    $(id).show();
    id = "#" + keyword + "s-row";
    $(id).show();
}
function showRowWithDetails(keyword) {
    showRow(keyword);
    showAll(keyword);
}
function showAll(keyword) {
    prefix = keyword.split('_')[0]; 
    $("[id*='" + keyword + "-list']").show();
    $("[id*='" + keyword + "-details']").show();
    $("[id*='" + keyword + "-filter']").show();
    $("[id*='" + keyword + "-filtericon']").removeClass('glyphicon-check');
    $("[id*='" + keyword + "-filtericon']").addClass('glyphicon-unchecked');
    $("[id*='" + prefix + "_region-']").show();
    $("[id*='" + prefix + "_region-filtericon']").removeClass('glyphicon-unchecked');
    $("[id*='" + prefix + "_region-filtericon']").addClass('glyphicon-check');
}
function toggleDetails(keyword, item) {
    var id = '#' + keyword + '-' + item;
    $(id).toggle();
}

function updateNavbar(active) {
    prefix = active.split('_')[0];
    $('[id*="_dropdown"]').removeClass('active-dropdown');
    $('#' + prefix + '_dropdown').addClass('active-dropdown');
}
function toggleVisibility(id) {
    id1 = '#' + id;
    $(id1).toggle()
    id2 = '#bullet-' + id;
    if ($(id1).is(":visible")) {
        $(id2).html('<i class="glyphicon glyphicon-collapse-down"></i>');
    } else {
        $(id2).html('<i class="glyphicon glyphicon-expand"></i>');
    }
}
function iterateEC2ObjectsAndCall(data, entities, callback, callback_args) {
    if (entities.length > 0) {
        var entity = entities.shift();
        var recurse = entities.length;
        for (i in data[entity]) {
            if (recurse) {
                iterateEC2ObjectsAndCall(data[entity][i], eval(JSON.stringify(entities)), callback, callback_args);
            } else {
                callback(data[entity][i], callback_args);
            }
        }
    }
}
function findEC2Object(ec2_data, entities, id) {
    if (entities.length > 0) {
        var entity = entities.shift();
        var recurse = entities.length;
        for (i in ec2_data[entity]) {
            if (recurse) {
                var object = findEC2Object(ec2_data[entity][i], eval(JSON.stringify(entities)), id);
                if (object) {
                    return object;
                }
            } else if(i == id) {
                return ec2_data[entity][i];
            }
        }
    }
    return '';
}
function findEC2ObjectByAttr(ec2_data, entities, attributes) {
    if (entities.length > 0) {
        var entity = entities.shift();
        var recurse = entities.length;
        for (i in ec2_data[entity]) {
            if (recurse) {
                var object = findEC2ObjectByAttr(ec2_data[entity][i], eval(JSON.stringify(entities)), attributes);
                if (object) {
                    return object;
                }
            } else {
                var found = true;
                for (attr in attributes) {
                    // h4ck :: EC2 security groups in RDS are lowercased...
                    if (ec2_data[entity][i][attr].toLowerCase() != attributes[attr].toLowerCase()) {
                        found = false;
                    }
                }
                if (found) {
                    return ec2_data[entity][i];
                }
            }
        }
    }
    return '';
}
function findEC2ObjectAttribute(ec2_info, path, id, attribute) {
    var entities = path.split('.');
    var object = findEC2Object(ec2_info, entities, id);
    if (object[attribute]) {
        return object[attribute];
    }
    return '';
}
function findAndShowEC2Object(path, id) {
    entities = path.split('.');
    var object = findEC2Object(ec2_info, entities, id);
    var etype = entities.pop();
    if (etype == 'instances') {
        $('#overlay-details').html(single_ec2_instance_template(object));
    } else if(etype == 'security_groups') {
        $('#overlay-details').html(single_ec2_security_group_template(object));
    } else if (etype == 'vpcs') {
        $('#overlay-details').html(single_ec2_vpc_template(object));
    } else if (etype == 'network_acls') {
        object['name']=id;
        $('#overlay-details').html(single_ec2_network_acl_template(object));
    }
    showPopup();
}
function findAndShowEC2ObjectByAttr(path, attributes) {
    entities = path.split('.');
    var object = findEC2ObjectByAttr(ec2_info, entities, attributes);
    var etype = entities.pop();
    if (etype == 'security_groups') {
        $('#overlay-details').html(single_ec2_security_group_template(object));
    }
    showPopup();
}
function showEC2Instance2(data) {
    $('#overlay-details').html(single_ec2_instance_template(data));
    showPopup();
}
function showEC2Instance(region, vpc, id) {
    var data = ec2_info['regions'][region]['vpcs'][vpc]['instances'][id];
    $('#overlay-details').html(single_ec2_instance_template(data));
    showPopup();
}
function showEC2SecurityGroup(region, vpc, id) {
    var data = ec2_info['regions'][region]['vpcs'][vpc]['security_groups'][id];
    $('#overlay-details').html(single_ec2_security_group_template(data));
    showPopup();
}
function showIAMGroup(group_name) {
    var data = iam_info['groups'][group_name];
    $('#overlay-details').html(single_iam_group_template(data));
    showPopup();
}
function showIAMManagedPolicy(policy_arn) {
    var data = iam_info['managed_policies'][policy_arn];
    data['policy_name'] = policy_friendly_name(policy_arn);
    data['report_id'] = policy_arn.replace(/:/g, '-').replace(/\//g, '-');
    showIAMPolicy(data);
}
function showIAMInlinePolicy(iam_entity_type, iam_entity_name, policy_name) {
    var data = iam_info[iam_entity_type][iam_entity_name]['policies'][policy_name];
    data['policy_name'] = policy_name;
    data['report_id'] = iam_entity_type + '-' + iam_entity_name + '-' + policy_name;
    showIAMPolicy(data);
}
function showIAMPolicy(data) {
    $('#overlay-details').html(single_iam_policy_template(data));
    showPopup();
    var id = '#iam_policy_details-' + data['report_id'];
    $(id).toggle();
}
function showIAMRole(role_name) {
    var data = iam_info['roles'][role_name];
    $('#overlay-details').html(single_iam_role_template(data));
    showPopup();
}
function showIAMUser(user_name) {
    var data = iam_info['users'][user_name];
    $('#overlay-details').html(single_iam_user_template(data));
    showPopup();
}
function showS3Bucket(bucket_name) {
    var data = s3_info['buckets'][bucket_name];
    $('#overlay-details').html(single_s3_bucket_template(data));
    showPopup();
}
function showS3Object(bucket_name, object_name) {
    var data = s3_info['buckets'][bucket_name]['keys'][object_name];
    data['name'] = object_name;
    data['bucket_name'] = bucket_name;
    $('#overlay-details').html(single_s3_object_template(data));
    showPopup();
}
function showPopup() {
    $("#overlay-background").show();
    $("#overlay-details").show();
}
function hidePopup() {
    $("#overlay-background").hide();
    $("#overlay-details").hide();
}

// Generic toggle filter function
function toggle_filter(data, filter_name) {
    var filter = data['filters'][filter_name];
    var entities = filter['entity'].split('.');
    var entity = finding_entity(filter['keyword_prefix'], filter['entity']);
    var checkbox = $("#" + entity + '-filtericon-' + filter_name);
    if (checkbox.hasClass("glyphicon-check")) {
        checkbox.removeClass("glyphicon-check");
        checkbox.addClass("glyphicon-unchecked");
        filter['enabled'] = false;
    } else {
        checkbox.removeClass("glyphicon-unchecked");
        checkbox.addClass("glyphicon-check");
        filter['enabled'] = true;
    }
    // Iterate through the objects and update visibility
    iterateEC2ObjectsAndCall(data, entities, toggle_filter_callback, new Array(entity, data['filters']));
}
function toggle_region(keyword, region_name) {
    var entity = keyword + '_region';
    var checkbox = $("#" + entity + '-filtericon-' + region_name);
    if (checkbox.hasClass("glyphicon-check")) {
        hideRegion(keyword, region_name);
    } else {
        showRegion(keyword, region_name);
    }
}
function clear_all_regions(keyword) {
    var info = window[keyword + '_info'];
    for (region in info['regions']) {
        hideRegion(keyword, region);
    }
    $('[id="' + keyword  + '_region-filter-select_all"]').show();
    $('[id="' + keyword  + '_region-filter-select_none"]').hide();
}
function select_all_regions(keyword) {
    var info = window[keyword + '_info'];
    for (region in info['regions']) {
        showRegion(keyword, region);
    }
    $('[id="' + keyword  + '_region-filter-select_all"]').hide();
    $('[id="' + keyword  + '_region-filter-select_none"]').show();
}
function hideRegion(keyword, region_name) {
    var checkbox = $("#" + keyword + '_region-filtericon-' + region_name);
    checkbox.removeClass("glyphicon-check");
    checkbox.addClass("glyphicon-unchecked");
    hideItem(keyword + '_region', region_name);
}
function showRegion(keyword, region_name) {
    var checkbox = $("#" + keyword + '_region-filtericon-' + region_name);
    checkbox.removeClass("glyphicon-unchecked");
    checkbox.addClass("glyphicon-check");
    showItem(keyword + '_region', region_name);
}

// Generic toggle filter callback
function toggle_filter_callback(object, args) {
    var must_hide = false;
    var entity = args[0];
    var filters = args[1];
    // Go through each active filter
    for (f in filters) {
        if (filters[f]['enabled']) {
            if ($.inArray(object['id'], filters[f]['items']) > -1) {
                must_hide = true;
            }
        }
    }
    if (must_hide) {
        hideItem(entity, object['id']);
    } else {
        showItem(entity, object['id']);
    }
}

// Contents loading
function load_config(keyword) {
    var info = {};
    $("#section_title-h2").text('');
    if (!(keyword in loaded_config_array)) {
        hideAll();
        $('[id="please_wait-row"]').show();
        setTimeout(function(){
            if (keyword == 'cloudtrail') {
                info = cloudtrail_info;
                load_aws_config_from_json(cloudtrail_info['regions'], 'cloudtrail_region', 2);
                highlight_violations(cloudtrail_info['violations'], 'cloudtrail');
                load_aws_config_from_json(cloudtrail_info['violations'], 'cloudtrail_dashboard', 1);
            }
            else if (keyword == 'ec2') {
                info = ec2_info;
                load_aws_config_from_json(ec2_info['regions'], 'ec2_elb', 2);
                load_aws_config_from_json(ec2_info['regions'], 'ec2_vpc', 2);
                load_aws_config_from_json(ec2_info['regions'], 'ec2_security_group', 2);
                load_aws_config_from_json(ec2_info['regions'], 'ec2_network_acl', 2);
                load_aws_config_from_json(ec2_info['regions'], 'ec2_instance', 2);
                load_aws_config_from_json(ec2_info['attack_surface'], 'ec2_attack_surface', 1);
                highlight_violations(ec2_info['violations'], 'ec2');
                load_aws_config_from_json(ec2_info['violations'], 'ec2_dashboard', 1);
                load_filters_from_json(ec2_info['filters']);
            }
            else if (keyword == 'iam') {
                info = iam_info;
                load_aws_config_from_json(iam_info['groups'], 'iam_group', 2);
                load_aws_config_from_json(iam_info['permissions'], 'iam_permission', 1);
                load_aws_config_from_json(iam_info['roles'], 'iam_role', 2);
                load_aws_config_from_json(iam_info['users'], 'iam_user', 2);
                if ('credential_report' in iam_info) {
                    load_aws_config_from_json(iam_info['credential_report']['<root_account>'], 'iam_credential_report', 1);
                }
                highlight_violations(iam_info['violations'], 'iam');
                load_aws_config_from_json(iam_info['violations'], 'iam_dashboard', 1);
                load_filters_from_json(iam_info['filters']);
            }
            else if (keyword == 'rds') {
                info = rds_info;
                load_aws_config_from_json(rds_info['regions'], 'rds_security_group', 2);
                load_aws_config_from_json(rds_info['regions'], 'rds_instance', 2);
                highlight_violations(rds_info['violations'], 'rds');
                load_aws_config_from_json(rds_info['violations'], 'rds_dashboard', 1);
            }
            else if (keyword == 's3') {
                info = s3_info;
                load_aws_config_from_json(s3_info['buckets'], 's3_bucket', 2);
                highlight_violations(s3_info['violations'], 's3');
                load_aws_config_from_json(s3_info['violations'], 's3_dashboard', 1);
            }
            if ('regions' in info) {
                load_region_filters(keyword, info['regions']);
            }
            $('[id="' + keyword + '_load_button"]').hide();
            $('[id="please_wait-row"]').hide();
            loaded_config_array.push(keyword);
            list_generic(keyword + '_dashboard');
        }, 50);
    }
}

// Browsing functions
function about() {
    hideAll();
    $('#about-row').show();
}
function browseTo(keyword, id) {
    // Hide similar details
    $("[id*='" + keyword + "-details-']").hide();
    // Show the requested details
    $("[id='" + keyword + "-details-" + id + "']").show();
    // Scroll to the top
    window.scrollTo(0,0);
}
function list_generic(keyword) {
    updateNavbar(keyword);
    hideAll();
    showRowWithDetails(keyword);
    prefix = keyword.split('_')[0];
    $('[id="' + prefix  + '_region-filter-select_all"]').hide();
    title = keyword.replace(/_/g, ' ');
    title = title.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
    title = title.replace("Cloudtrail","CloudTrail").replace("Ec2","EC2").replace("Iam","IAM").replace("Rds","RDS");
    title = title.replace("Elb", "ELB").replace("Acl","ACL");
    $("#section_title-h2").text(title);
    window.scrollTo(0,0);
}
function list_findings(keyword, violations, finding) {
    updateNavbar(keyword);
    hideAll();
    showEmptyRow(keyword);
    $("#section_title-h2").text(violations[finding]['description']);
    if (violations[finding]['macro_items'].length == violations[finding]['items'].length ) {
        items = [];
        dict  = {};
        for (mi in violations[finding]['macro_items']) {
            if (dict.hasOwnProperty(violations[finding]['macro_items'][mi])) {
                continue;
            }
            items.push(violations[finding]['macro_items'][mi]);
            dict[violations[finding]['macro_items'][mi]] = 1;
        }
    } else {
        items = violations[finding]['items'];
    }
    for (item in items) {
        showItem(keyword, items[item]);
    }
    window.scrollTo(0,0);
}

// Handlebars helpers
Handlebars.registerHelper('displayPolicy', function(blob, decodeURI) {
    var policy = '';
    if (decodeURI) {
         policy = decodeURIComponent(blob);
    } else {
        policy = JSON.stringify(eval("(" + blob + ")"), null, 2);
    }
    policy = policy.replace(/ /g, '&nbsp;');
    policy = policy.replace(/\n/g, '<br />');
    return policy;
});
Handlebars.registerHelper("has_profiles?", function(logins) {
    if(typeof logins != 'undefined' && logins != '') {
        return 'Yes';
    } else {
        return 'No';
    }
});
Handlebars.registerHelper('has_access_keys?', function(access_keys) {
    if (typeof access_keys != 'undefined' && access_keys != '') {
        return access_keys.length;
    } else {
        return 0;
    }
});
Handlebars.registerHelper('has_mfa?', function(mfa_devices) {
    if (typeof mfa_devices != 'undefined' && mfa_devices != '') {
        return 'Yes';
    } else {
        return 'No';
    }
});
Handlebars.registerHelper('list_permissions', function(permissions) {
    var r = '';
    if (typeof permissions != 'undefined' && permissions != '') {
        r += parse_entities('group', permissions.groups);
        r += parse_entities('role', permissions.roles);
        r += parse_entities('user', permissions.users);
    }
    return r;
});
var gc = {}; gc['group'] = 0; gc['role'] = 0; gc['user'] = 0;
function parse_entities(keyword, permissions) {
    var p = '';
    var r = '';
    for (i in permissions) {
        p += format_entity(keyword, permissions[i].name, permissions[i].policy_name, gc[keyword]++);
    }
    if (p != '') {
        r = '<p>' + keyword.charAt(0).toUpperCase() + keyword.slice(1) + 's:</p><ul>' + p + '</ul>';
    }
    return r;
}
function format_entity(keyword, name, policy_name, c) {
    var r = '';
    r += "<li>" + name + " [<a href=\"javascript:toggleDetails('" + keyword + "'," + c + ")\">Details</a>]";
    r += "<div class=\"row\" style=\"display:none\" id=\"" + keyword + "-" + c + "\">" + policy_name + "</div></li>";
    return r;
}
Handlebars.registerHelper('s3_grant_2_icon', function(value) {
    return '<i class="' + ((value == true) ? 'glyphicon glyphicon-ok' : '') +'"></i>';
});
Handlebars.registerHelper('good_bad_icon', function(violation, bucket_name, item) {
    var index = s3_info['violations'][violation]['items'].indexOf(item);
    if (index > -1) {
        return '<i class="glyphicon glyphicon-remove"></i>';
    } else {
        var key_details = s3_info['buckets'][bucket_name]['keys'][item];
        if (((violation == 'object-perms-mismatch-bucket-perms') && !('grants' in key_details)) 
            ||((violation == 'unencrypted-s3-objects') && !('encrypted' in key_details))) {
            return '<i class="glyphicon glyphicon-question-sign"></i>';
        } else {
            return '<i class="glyphicon glyphicon-ok finding-good"></i>';
        }
    }
});
Handlebars.registerHelper('has_logging?', function(logging) {
    return logging;
});
Handlebars.registerHelper('finding_entity', function(prefix, entity) {
    return finding_entity(prefix, entity);
});
function finding_entity(prefix, entity) {
    entity = entity.split('.').pop();
    elength = entity.length;
    if (entity.substring(elength - 1, elength) == 's') {
        return prefix + '_' + entity.substring(0, elength - 1);
    } else {
        return prefix + '_' + entity;
    }
}
Handlebars.registerHelper('friendly_name', function(entity) {
    var name = entity.split('.').pop();
    name = name.replace('_', ' ');
    return name.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
});
Handlebars.registerHelper('count', function(items) {
    var c = 0;
    for (i in items) {
        c = c + 1;
    }
    return c;
});
Handlebars.registerHelper('count_in', function(service, path) {
    var entities = path.split('.');
    if (service == 'ec2') {
        var input = ec2_info;
    } else if(service == 'cloudtrail') {
        var input = cloudtrail_info;
    } else {
        return 0;
    }
    return recursive_count(input, entities);
});
Handlebars.registerHelper('count_ec2_in_region', function(region, path) {
    if (typeof ec2_info != 'undefined') {
        var count = 0;
        var entities = path.split('.');
        for (r in ec2_info['regions']) {
            if (r == region) {
                return recursive_count(ec2_info['regions'][r], entities);
            }
        }
    } else {
        count = 'N/A';
    }
    return count;
});
Handlebars.registerHelper('count_vpc_network_acls', function(vpc_network_acls) {
    var c = 0;
    for (x in vpc_network_acls) {
            c = c + 1;
    }
    return c;
});
Handlebars.registerHelper('count_vpc_instances', function(vpc_instances) {
    var c = 0;
    for (x in vpc_instances) {
            c = c + 1;
    }
    return c;
});
Handlebars.registerHelper('count_role_instances', function(instance_profiles) {
    var c = 0;
    for (ip in instance_profiles) {
        for (i in instance_profiles[ip]['instances']) {
            c = c + 1;
        }
    }
    return c;
});
var recursive_count = function(input, entities) {
    var count = 0;
    if (entities.length > 0) {
        var entity = entities.shift();
        for (i in input[entity]) {
            count = count + recursive_count(input[entity][i], eval(JSON.stringify(entities)));
        }
    } else {
        count = count + 1;
    }
    return count;
}
Handlebars.registerHelper('find_ec2_object_attribute', function(path, id, attribute ) {
    return findEC2ObjectAttribute(ec2_info, path, id, attribute);
});
Handlebars.registerHelper('format_date', function(timestamp) {
    return new Date(timestamp * 1000).toString();
});
Handlebars.registerHelper('format_network_acls', function (acls, direction) {
    r = '<table class="table-striped" width="100%">';
    r += '<tr><td width="20%" class="text-center">Rule number</td>';
    r += '<td width="20%" class="text-center">Port</td>';
    r += '<td width="20%" class="text-center">Protocol</td>';
    r += '<td width="20%" class="text-center">' + direction + '</td>';
    r += '<td width="20%" class="text-center">Action</td></tr>';
    for (a in acls) {
        r += '<tr>';
        r += '<td width="20%" class="text-center">' + acls[a]['rule_number'] + '</td>';
        r += '<td width="20%" class="text-center">' + acls[a]['port_range'] + '</td>';
        r += '<td width="20%" class="text-center">' + acls[a]['protocol'] + '</td>';
        r += '<td width="20%" class="text-center">' + acls[a]['cidr_block'] + '</td>';
        r += '<td width="20%" class="text-center">' + acls[a]['rule_action'] + '</td>';
        r += '</tr>';
    }
    r += '</table>';
    return r;
});
Handlebars.registerHelper('make_title', function(title) {
    return (title.charAt(0).toUpperCase() + title.substr(1).toLowerCase());
});
Handlebars.registerHelper('entity_details_callback', function(type) {
    if (type == 'roles') {
        return 'showIAMRole';
    } else if (type == 'groups') {
        return 'showIAMGroup';
    } else if (type == 'users') {
        return 'showIAMUser';
    }
});
Handlebars.registerHelper('addMember', function(member_name, value) {
    this[member_name] = value;
});
Handlebars.registerHelper('ifShow', function(v1, v2, options) {
  if(v1 !== v2) {
    return options.fn(this);
  }
});
Handlebars.registerHelper('fixBucketName', function(bucket_name) {
    if (bucket_name != undefined) {
        return bucket_name.replace(/\./g, '-');
    }
});
// http://funkjedi.com/technology/412-every-nth-item-in-handlebars, slightly tweaked to work with a dictionary
Handlebars.registerHelper('grouped_each', function(every, context, options) {
    var out = "", subcontext = [], i;
    var keys = Object.keys(context);
    var count = keys.length;
    var subcontext = {};
    if (context && count > 0) {
        for (i = 0; i < count; i++) {
            if (i > 0 && i % every === 0) {
                out += options.fn(subcontext);
                subcontext = {};
            }
            subcontext[keys[i]] = context[keys[i]];
        }
        out += options.fn(subcontext);
    }
    return out;
});
Handlebars.registerHelper('dashboard_color', function(level, checked, flagged) {
    if (checked == 0) {
        return 'unknown disabled-link';
    } else if (flagged == 0) {
        return 'good disabled-link';
    } else {
        return level;
    }
});
Handlebars.registerHelper('policy_friendly_name', function(arn) {
    return policy_friendly_name(arn);
});
var policy_friendly_name = function(arn) {
    return arn.split(':policy/').pop();
}
Handlebars.registerHelper('policy_report_id', function(policy, a, b, c) {
    policy['report_id'] = a + '-' + b + '-' + c;
});
