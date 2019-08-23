/**
 * Core utilities used by other Nano libraries.
 */

(function (root)
{
  "use strict";

  /** 
   * Set up the Nano namespace.
   */
  if (root.Nano === undefined)
    root.Nano = {};

  /**
   * Extend a new class using a parent base class.
   *
   * @param {function} base  The base class we are extending from.
   * @param {function} sub  The sub class we are creating.
   * @param {boolean|object} copyDef  See below.
   *
   * @return {function} The new class after extending has been completed.
   *
   * If the subclass parameter is undefined or null, we'll create a default
   * function that simply calls the base class constructor with all arguments
   * passed as is. This allows for easy construction of child classes:
   *
   *   var childclass = Nano.extend(parentclass);
   *
   * or if you want to copy public properties from the base class that aren't
   * in the prototype, then:
   *
   *   var childclass = Nano.extend(parentclass, null, true);
   *
   * If you need to specify your own child class constructor,
   * make sure it calls any necessary parent constructors.
   *
   * If copyDef is the boolean true value, it becomes {copyProperties: true}.
   * If copyDef is an object, it may have the following properties:
   *
   *  copyProperties: A propOpts value to be passed to Nano.copyProperties();
   *  copyInto: An array of sources to send to Nano.copyInto();
   *
   * The copyProperties call if used will look like:
   *  Nano.copyProperties(base, sub, copyDef.copyProperties);
   *
   * The copyProperties and copyInto copyDef properties can be used together.
   *
   * This can probably be deprecated as ES2015 classes don't need it.
   */
  Nano.extend = function (base, sub, copyDef)
  {
//    console.error("Nano.extend()", base, sub, copyall);
    if (typeof base !== 'function')
    {
      console.error("Nano.extend(base): base passed was not function", arguments);
      return;
    }

    if (sub === undefined || sub === null)
    {
      sub = function ()
      {
        var args = Array.prototype.slice.call(arguments);
        base.apply(this, args);
      }
//      console.log("Generated empty child", sub);
    }
    else if (typeof sub !== 'function')
    {
      console.error("Nano.extend(base, sub): sub passed was not function", arguments);
      return;
    }

    sub.prototype = Object.create(base.prototype);

    // Shortcut for copying all base class properties.
    if (copyDef === true)
    {
      copyDef = {copyProperties: true};
    }

    // Copy class properties from the base class.
    if (copyDef && copyDef.copyProperties)
    {
      Nano.copyProperties(base, sub, copyDef.copyProperties);
    }

    // Copy properties in from mixin/trait objects.
    if (copyDef && copyDef.copyInto)
    {
      var copyInto = [sub];
      for (var c = 0; c < copyDef.copyInto.length; c++)
      {
        copyInto.push(copyDef.copyInto[c]);
      }
      Nano.copyInto.apply(Nano, copyInto);
    }

    return sub;
  }

  /**
   * A way to handle Mixins/Traits.
   *
   * This is basically a magic wrapper around copyInto() which we use
   * instead of Object.assign() as we don't want to overwrite properties
   * by default. See copyInto() for the valid parameters.
   *
   * This does a bit of magic before passing it's parameters to copyInto().
   * As it's designed to extend the class prototype and only the prototype,
   * it will see if anything passed to it is a function/class and if so, it
   * will automatically use the prototype of the function/class. If you want
   * to copy static class properties, use copyInto() directly instead of this.
   */
  Nano.addTraits = function (target, ...inSources)
  {
    var outSources = [];

    function unwrap (what)
    {
      if (typeof what === 'function' && typeof what.prototype === 'object')
      {
        return what.prototype;
      }
      else if (typeof what === 'object')
      {
        return what;
      }
      else
      {
        throw new Error("Invalid function/object passed to addTraits()");
      }
    }

    target = unwrap(target); // Ensure the target is an object.

    for (var s in inSources)
    {
      var source = inSources[s];
      if (typeof source === 'boolean')
      { // Booleans are a special case used by copyInto()
        outSources.push(source);
      }
      else
      { // Anything else needs to be unwrapped.
        outSources.push(unwrap(source));
      }
    }

    return Nano.copyInto(target, outSources);
  }

  /**
   * Copy properties between objects. Can be used for mixins/traits.
   *
   * @param  {object|function} target   The target we are copying into.
   * @params {...(object|function|boolean)} sources The sources we copy from.
   * If a source is a boolean, it changes the 'overwrite' behavior for any
   * objects/functions following it. If 'overwrite' is true, existing
   * properties with the same name already in the target will be overwritten.
   * If 'overwrite' is false (the default) then they will not be overwritten.
   *
   * This calls
   *  Nano.copyProperties(source, target, {default: true, overwrite: overwrite})
   * for each of the sources specified (with the current overwrite value.)
   */
  Nano.copyInto = function (target, ...sources)
  {
    var overwrite = false;
//    console.log("Nano.copyInto()", target, sources);
    for (var s in sources)
    {
      var source = sources[s];
      var stype = typeof source;
//      console.log("source", source, stype);
      if (stype === 'boolean')
      {
        overwrite = source;
      }
      else if (stype === 'object' || stype === 'function')
      {
//        console.log("copying properties", source);
        Nano.copyProperties(source, target, {default: true, overwrite: overwrite});
      }
      else
      {
        throw new Error("Invalid function/object passed to copyInto()");
      }
    }
    return target;
  }

  /**
   * Copy properties from one object to another.
   *
   * @param {object|function} source  The object to copy properties from.
   * @param {object|function} target  The target to copy properties to.
   * @param {object} propOpts  Options, see below.
   *
   * If propOpts is anything other than a non-null object, it's the same as
   * passing {default: true}.
   *
   * Options supported:
   *
   *  default:   boolean      If true, copy enumerable properties.
   *  all:       boolean      If true, copy ALL properties.
   *  props:     array        A list of properties to copy.
   *  overrides: object       A map of descriptor overrides for properties.
   *  overwrite: boolean      Overwrite existing properties if true.
   *  exclude:   array        A list of properties NOT to copy.
   * 
   * If 'props' is set, it overrides all other options for which properties
   * to copy. If 'all' is true, all properties including special ones will
   * be copied. If 'default' is true, all enumerable properties will be copied.
   * If none of those are specified, but 'overrides is set,
   * only the properties named in the 'overrides' will be copied.
   *
   * Be very careful with 'overwrite', it's a dangerous option.
   *
   * @return void
   */
  Nano.copyProperties = function (source, target, propOpts)
  {
    if (propOpts === null || typeof propOpts !== 'object')
      propOpts = {default: true};

    var defOverrides = 'overrides' in propOpts ? propOpts.overrides : {};
    var overwrite    = 'overwrite' in propOpts ? propOpts.overwrite : false;

    var exclude = Array.isArray(propOpts.exclude) ? propOpts.exclude : null;

    var propDefs;

    if (propOpts.props && Array.isArray(propOpts.props))
    {
      propDefs = propOpts.props;
    }
    else if (propOpts.all)
    {
      propDefs = Object.getOwnPropertyNames(source); 
    }
    else if (propOpts.default)
    {
      propDefs = Object.keys(source);
    }
    else if (propOpts.overrides)
    {
      propDefs = Object.keys(propOpts.overrides);
    }

    if (!propDefs)
    {
      console.error("Could not determine properties to copy", propOpts);
      return;
    }

    // For each propDef found, add it to the target.
    for (var p = 0; p < propDefs.length; p++)
    {
      var prop = propDefs[p];
      if (exclude && exclude.indexOf(prop) !== -1)
        continue; // Excluded property.
      var def = Object.getOwnPropertyDescriptor(source, prop)
      if (def === undefined) continue; // Invalid property.
      if (prop in defOverrides && typeof defOverrides[prop] === 'object')
      {
        for (var key in defOverrides[prop])
        {
          var val = defOverrides[prop][key];
          def[key] = val;
        }
      }
      if (overwrite || target[prop] === undefined)
      { // Property doesn't already exist, let's add it.
        Object.defineProperty(target, prop, def);
      }
    }
  }

  /**
   * A wrapper around Object.defineProperty() that assigns a value to
   * the property.
   *
   * @param object object    The object we are adding a property to.
   * @param string name      The property name.
   * @param mixed  val       The value we are assigning to the property.
   * @param mixed  opts      See below for valid values.
   *
   * The 'opts' if specified can be the boolean true, in which case the
   * property will be configurable later, or can be an object with:
   *
   *  'configurable'   Should this property be configurable (default: false).
   *  'enumerable'     Should this property be enumerable (default: false).
   *  'writable'       Should this property be writable (default: false).
   *
   */
  Nano.addProperty = function (object, name, val, opts)
  {
    if (opts === true)
      opts = {configurable: true};
    else if (typeof opts !== 'object' || opts === null)
      opts = {};

    var props =
    {
      value:         val,
      enumerable:    ('enumerable'   in opts ? opts.enumerable   : false),
      configurable:  ('configurable' in opts ? opts.configurable : false),
      writable:      ('writable'     in opts ? opts.writable     : false),
    }; 
    Object.defineProperty(object, name, props);
  }

  /**
   * A wrapper around Object.defineProperty() that assigns an accessor to
   * the property.
   *
   * @param object   object    The object we are adding an accessor to.
   * @param string   name      The property name for the accessor.
   * @param function getter    The getter function for the accessor.
   * @param function setter    The setter function for the accessor.
   * @param mixed    opts      See below for valid values.
   *
   * The 'opts' if specified can be the boolean true, in which case the
   * property will be configurable later, or can be an object with:
   *
   *  'configurable'   Should this property be configurable (default: false).
   *  'enumerable'     Should this property be enumerable (default: false).
   *
   */
  Nano.addAccessor = function (object, name, getter, setter, opts)
  {
    if (opts === true)
      opts = {configurable: true};
    else if (typeof opts !== 'object' || opts === null)
      opts = {};

    var props =
    {
      get:          getter,
      set:          setter,
      enumerable:   ('enumerable'   in opts ? opts.enumerable   : false),
      configurable: ('configurable' in opts ? opts.configurable : false),
    };
    Object.defineProperty(object, name, props);
  }

  /**
   * Add 'addProperty' and 'addAccessor' helpers to the object directly.
   * Useful if you're going to be adding a lot of properties/accessors.
   */
  Nano.addMetaHelpers = function (object, configurable)
  {
    Nano.addProperty(object, 'addProperty', function (pn,pf,opts)
    {
      Nano.addProperty(this, pn, pf, opts);
    }, configurable);
    Nano.addProperty(object, 'addAccessor', function (pn, gf, sf, opts)
    {
      Nano.addAccessor(this, pn, gf, sf, opts);
    }, configurable);
  }

  /**
   * Clone a simple object, using a simple JSON chain.
   *
   * Can also clone extended properties that aren't serialized in JSON.
   *
   * @param {Object}                object           Object to clone.
   * @param {boolean|array|object}  copyProperties   See below.
   *
   * @return {Object}  A clone of the object.
   *
   * If copyProperties is defined, and is a non-false value, then we'll
   * call Nano.copyProperties(object, clone, copyProperties);
   */
  Nano.clone = function clone (object, copyProperties)
  {
    var clone = JSON.parse(JSON.stringify(object));
    if (copyProperties)
    {
      Nano.copyProperties(object, clone, copyProperties);
    }
    return clone;
  }

  /**
   * Register a global Namespace.
   */
  Nano.registerNamespace = function (namespaces)
  {
    if (typeof namespaces === 'string')
    {
      namespaces = namespaces.split('.');
    }
    var cns = root;
    for (var n in namespaces)
    {
      var ns = namespaces[n];
      if (cns[ns] === undefined)
      {
        cns[ns] = {};
      }
      cns = cns[ns];
    }
  }

  /**
   * See if a global Namespace is registered.
   */
  Nano.hasNamespace = function (namespaces, logerror)
  {
    if (typeof namespaces === 'string')
    {
      namespaces = namespaces.split('.');
    }
    var cns = root;
    for (var n in namespaces)
    {
      var inns = namespaces[n];
      if (!Array.isArray(inns))
      {
        inns = [inns];
      }
      for (var i in inns)
      {
        var ns = inns[i];
        if (cns[ns] === undefined)
        {
          if (logerror)
          {
            console.error("Required namespace not found", namespaces);
          }
          return false;
        }
      }
      cns = cns[ns];
    }
    return true;
  }

  /**
   * See if a value is set, and if not, return a default value.
   */
  Nano.getDef = function (opt, defvalue)
  {
    if (opt === undefined || opt === null)
      return defvalue;
    return opt;
  }

  /**
   * See if a property exists in an object. 
   * If it do, return the property.
   * If it doesn't, return a default value.
   */
  Nano.getOpt = function (opts, optname, defvalue)
  {
    if (opts[optname] === undefined)
      return defvalue;
    return opts[optname];
  }

  /**
   * Get a property from a nested data structure.
   * Based on the same way we handle namespaces.
   */
  Nano.getNested = function (obj, proppath)
  {
    if (typeof proppath === 'string')
    {
      proppath = proppath.split('.');
    }
    for (var p = 0; p < proppath.length; p++)
    {
      var propname = proppath[p];
      if (obj[propname] === undefined)
      { // End of search, sorry.
        return undefined;
      }
      obj = obj[propname];
    }
    return obj;
  }

})(window);

