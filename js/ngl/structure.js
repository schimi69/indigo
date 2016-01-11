/**
 * @file Structure
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 */


////////////
// GidPool

NGL.GidPool = {

    // REMEMBER not synced with worker

    nextGid: 1,

    objectList: [],

    rangeList: [],

    addObject: function( object ){

        NGL.GidPool.objectList.push( object );

        NGL.GidPool.rangeList.push( NGL.GidPool.allocateGidRange( object ) );

        return NGL.GidPool;

    },

    removeObject: function( object ){

        var idx = NGL.GidPool.objectList.indexOf( object );

        if( idx !== -1 ){

            NGL.GidPool.objectList.splice( idx, 1 );
            NGL.GidPool.rangeList.splice( idx, 1 );

            if( NGL.GidPool.objectList.length === 0 ){
                NGL.GidPool.nextGid = 1;
            }

        }

        return NGL.GidPool;

    },

    updateObject: function( object, silent ){

        var idx = NGL.GidPool.objectList.indexOf( object );

        if( idx !== -1 ){

            var range = NGL.GidPool.rangeList[ idx ];

            if( range[1] === NGL.GidPool.nextGid ){

                var count = NGL.GidPool.getGidCount( object );
                NGL.GidPool.nextGid += count - ( range[1] - range[0] );
                range[ 1 ] = NGL.GidPool.nextGid;

            }else{

                NGL.GidPool.rangeList[ idx ] = NGL.GidPool.allocateGidRange( object );

            }

        }else{

            if( !silent ){

                NGL.warn( "NGL.GidPool.updateObject: object not found." );

            }

        }

        return NGL.GidPool;

    },

    getGidCount: function( object ){

        var count = 0;

        if( object.type === "Structure" ){

            count = object.atomStore.count + object.bondStore.count;

        }else if( object.type === "Volume" ){

            count = object.__data.length;

        }else{

            NGL.warn( "NGL.GidPool.getGidCount: unknown object type" );

        }

        return count;

    },

    allocateGidRange: function( object ){

        var firstGid = NGL.GidPool.nextGid;

        NGL.GidPool.nextGid += NGL.GidPool.getGidCount( object );

        if( NGL.GidPool.nextGid > Math.pow( 2, 24 ) ){
            NGL.error( "NGL.GidPool.allocateGidRange: GidPool overflown" );
        }

        return [ firstGid, NGL.GidPool.nextGid ];

    },

    freeGidRange: function( object ){

        // TODO

    },

    getNextGid: function(){

        return NGL.GidPool.nextGid++;

    },

    getGid: function( object, offset ){

        offset = offset || 0;

        var gid = 0;
        var idx = NGL.GidPool.objectList.indexOf( object );

        if( idx !== -1 ){

            var range = NGL.GidPool.rangeList[ idx ];
            var first = range[ 0 ];

            gid = first + offset;

        }else{

            NGL.warn( "NGL.GidPool.getGid: object not found." );

        }

        return gid;

    },

    getByGid: function( gid ){

        // TODO
        // - early exit
        // - binary search

        var entity;

        NGL.GidPool.objectList.forEach( function( o, i ){

            if( o.type === "Structure" ){

                if( gid < o.atomStore.count ){

                    o.eachAtom( function( a ){
                        if( NGL.GidPool.getGid( o, a.index ) === gid ){
                            entity = a.clone();
                        }
                    } );

                }else if( gid < o.atomStore.count + o.bondStore.count ){

                    gid -= o.atomStore.count;
                    o.eachBond( function( b ){
                        if( NGL.GidPool.getGid( o, b.index ) === gid ){
                            entity = b.clone();
                        }
                    } );

                }else{

                    NGL.warn( "NGL.GidPool.getByGid: invalid Structure gid" );

                }

            }else if( o.type === "Volume" ){

                var range = NGL.GidPool.rangeList[ i ];

                if( gid >= range[ 0 ] && gid < range[ 1 ] ){

                    var offset = gid - range[ 0 ];

                    entity = {
                        volume: o,
                        index: offset,
                        value: o.data[ offset ],
                        x: o.dataPosition[ offset * 3 ],
                        y: o.dataPosition[ offset * 3 + 1 ],
                        z: o.dataPosition[ offset * 3 + 2 ],
                    };

                }

            }else{

                NGL.warn( "NGL.GidPool.getByGid: unknown object type" );

            }

        } );

        return entity;

    }

}


///////////////
// ColorMaker

NGL.ColorMakerRegistry = {

    signals: {

        // typesChanged: new signals.Signal(),

    },

    scales: {

        "": "",

        // Sequential
        "OrRd": "[S] Orange-Red",
        "PuBu": "[S] Purple-Blue",
        "BuPu": "[S] Blue-Purple",
        "Oranges": "[S] Oranges",
        "BuGn": "[S] Blue-Green",
        "YlOrBr": "[S] Yellow-Orange-Brown",
        "YlGn": "[S] Yellow-Green",
        "Reds": "[S] Reds",
        "RdPu": "[S] Red-Purple",
        "Greens": "[S] Greens",
        "YlGnBu": "[S] Yellow-Green-Blue",
        "Purples": "[S] Purples",
        "GnBu": "[S] Green-Blue",
        "Greys": "[S] Greys",
        "YlOrRd": "[S] Yellow-Orange-Red",
        "PuRd": "[S] Purple-Red",
        "Blues": "[S] Blues",
        "PuBuGn": "[S] Purple-Blue-Green",

        // Diverging
        "Spectral": "[D] Spectral",
        "RdYlGn": "[D] Red-Yellow-Green",
        "RdBu": "[D] Red-Blue",
        "PiYG": "[D] Pink-Yellowgreen",
        "PRGn": "[D] Purplered-Green",
        "RdYlBu": "[D] Red-Yellow-Blue",
        "BrBG": "[D] Brown-Bluegreen",
        "RdGy": "[D] Red-Grey",
        "PuOr": "[D] Purple-Orange",

        // Qualitative
        "Set1": "[Q] Set1",
        "Set2": "[Q] Set2",
        "Set3": "[Q] Set3",
        "Dark2": "[Q] Dark2",
        "Paired": "[Q] Paired",
        "Pastel1": "[Q] Pastel1",
        "Pastel2": "[Q] Pastel2",
        "Accent": "[Q] Accent",

        // Other
        "roygb": "[?] Rainbow",
        "rwb": "[?] Red-White-Blue",

    },

    modes: {

        "": "",

        "rgb": "Red Green Blue",
        "hsv": "Hue Saturation Value",
        "hsl": "Hue Saturation Lightness",
        "hsi": "Hue Saturation Intensity",
        "lab": "CIE L*a*b*",
        "hcl": "Hue Chroma Lightness"

    },

    types: {},

    userSchemes: {},

    getScheme: function( params ){

        var p = params || {};

        var id = p.scheme || "";

        var schemeClass;

        if( id in NGL.ColorMakerRegistry.types ){

            schemeClass = NGL.ColorMakerRegistry.types[ id ];

        }else if( id in NGL.ColorMakerRegistry.userSchemes ){

            schemeClass = NGL.ColorMakerRegistry.userSchemes[ id ];

        }else{

            schemeClass = NGL.ColorMaker;

        }

        return new schemeClass( params );

    },

    getPickingScheme: function( params ){

        var p = Object.assign( params || {} );
        p.scheme = "picking";

        return NGL.ColorMakerRegistry.getScheme( p );

    },

    getTypes: function(){

        var types = {};

        Object.keys( NGL.ColorMakerRegistry.types ).forEach( function( k ){
            // NGL.ColorMakerRegistry.types[ k ]
            types[ k ] = k;
        } );

        Object.keys( NGL.ColorMakerRegistry.userSchemes ).forEach( function( k ){
            types[ k ] = k.split( "|" )[ 1 ];
        } );

        return types;

    },

    getScales: function(){

        return NGL.ColorMakerRegistry.scales;

    },

    getModes: function(){

        return NGL.ColorMakerRegistry.modes;

    },

    addScheme: function( scheme, label ){

        if( !( scheme instanceof NGL.ColorMaker ) ){

            scheme = NGL.ColorMakerRegistry.createScheme( scheme, label );

        }

        label = label || "";
        var id = "" + THREE.Math.generateUUID() + "|" + label;

        NGL.ColorMakerRegistry.userSchemes[ id ] = scheme;
        // NGL.ColorMakerRegistry.signals.typesChanged.dispatch();

        return id;

    },

    removeScheme: function( id ){

        delete NGL.ColorMakerRegistry.userSchemes[ id ];
        // NGL.ColorMakerRegistry.signals.typesChanged.dispatch();

    },

    createScheme: function( constructor, label ){

        var ColorMaker = function( params ){

            NGL.ColorMaker.call( this, params );

            this.label = label || "";

            constructor.call( this, params );

        }

        ColorMaker.prototype = NGL.ColorMaker.prototype;

        ColorMaker.prototype.constructor = ColorMaker;

        return ColorMaker;

    },

    addSelectionScheme: function( pairList, label ){

        return NGL.ColorMakerRegistry.addScheme( function( params ){

            var colorList = [];
            var selectionList = [];

            pairList.forEach( function( pair ){

                colorList.push( new THREE.Color( pair[ 0 ] ).getHex() );
                selectionList.push( new NGL.Selection( pair[ 1 ] ) );

            } );

            var n = pairList.length;

            this.atomColor = function( a ){

                for( var i = 0; i < n; ++i ){

                    if( selectionList[ i ].test( a ) ){

                        return colorList[ i ];

                    }

                }

                return 0xFFFFFF;

            };

        }, label );

    }

}


NGL.ColorMaker = function( params ){

    var p = params || {};

    this.scale = p.scale || "uniform";
    this.mode = p.mode || "hcl";
    this.domain = p.domain || [ 0, 1 ];
    this.value = new THREE.Color( p.value || 0xFFFFFF ).getHex();

    this.structure = p.structure;
    this.volume = p.volume;
    this.surface = p.surface;

};

NGL.ColorMaker.prototype = {

    constructor: NGL.ColorMaker,

    getScale: function( params ){

        var p = params || {};

        var scale = p.scale || this.scale;
        if( scale === "rainbow" || scale === "roygb" ){
            scale = [ "red", "orange", "yellow", "green", "blue" ];
        }else if( scale === "rwb" ){
            scale = [ "red", "white", "blue" ];
        }

        return chroma
            .scale( scale )
            .mode( p.mode || this.mode )
            .domain( p.domain || this.domain )
            .out( "num" );

    },

    atomColor: function( a ){

        return 0xFFFFFF;

    },

    atomColorToArray: function( a, array, offset ){

        var c = this.atomColor( a );

        if( array === undefined ) array = [];
        if( offset === undefined ) offset = 0;

        array[ offset + 0 ] = ( c >> 16 & 255 ) / 255;
        array[ offset + 1 ] = ( c >> 8 & 255 ) / 255;
        array[ offset + 2 ] = ( c & 255 ) / 255;

        return array;

    },

    bondColor: function( b, fromTo ){

        return this.atomColor( fromTo ? b.atom1 : b.atom2 );

    },

    bondColorToArray: function( b, fromTo, array, offset ){

        var c = this.bondColor( b, fromTo );

        if( array === undefined ) array = [];
        if( offset === undefined ) offset = 0;

        array[ offset + 0 ] = ( c >> 16 & 255 ) / 255;
        array[ offset + 1 ] = ( c >> 8 & 255 ) / 255;
        array[ offset + 2 ] = ( c & 255 ) / 255;

        return array;

    },

    volumeColor: function( i ){

        return 0xFFFFFF;

    },

    volumeColorToArray: function( i, array, offset ){

        var c = this.volumeColor( i );

        if( array === undefined ) array = [];
        if( offset === undefined ) offset = 0;

        array[ offset + 0 ] = ( c >> 16 & 255 ) / 255;
        array[ offset + 1 ] = ( c >> 8 & 255 ) / 255;
        array[ offset + 2 ] = ( c & 255 ) / 255;

        return array;

    }

};


NGL.ValueColorMaker = function( params ){

    NGL.ColorMaker.call( this, params );

    var valueScale = this.getScale();

    this.volumeColor = function( i ){

        return valueScale( this.volume.data[ i ] );

    };

};

NGL.ValueColorMaker.prototype = NGL.ColorMaker.prototype;

NGL.ValueColorMaker.prototype.constructor = NGL.ValueColorMaker;


NGL.PickingColorMaker = function( params ){

    NGL.ColorMaker.call( this, params );

    this.atomColor = function( a ){

        return NGL.GidPool.getGid( this.structure, a.index );

    };

    this.bondColor = function( b, fromTo ){

        var index = this.structure.atomStore.count + b.index;
        return NGL.GidPool.getGid( this.structure, index );

    };

    this.volumeColor = function( i ){

        return NGL.GidPool.getGid( this.volume, i );

    };

};

NGL.PickingColorMaker.prototype = NGL.ColorMaker.prototype;

NGL.PickingColorMaker.prototype.constructor = NGL.PickingColorMaker;


NGL.RandomColorMaker = function( params ){

    NGL.ColorMaker.call( this, params );

    this.atomColor = function( a ){

        return Math.random() * 0xFFFFFF;

    };

};

NGL.RandomColorMaker.prototype = NGL.ColorMaker.prototype;

NGL.RandomColorMaker.prototype.constructor = NGL.RandomColorMaker;


NGL.UniformColorMaker = function( params ){

    NGL.ColorMaker.call( this, params );

    var color = this.value;

    this.atomColor = function(){

        return color;

    };

    this.bondColor = function(){

        return color;

    };

    this.valueColor = function(){

        return color;

    };

};

NGL.UniformColorMaker.prototype = NGL.ColorMaker.prototype;

NGL.UniformColorMaker.prototype.constructor = NGL.UniformColorMaker;


NGL.AtomindexColorMaker = function( params ){

    NGL.ColorMaker.call( this, params );

    if( !params.scale ){
        this.scale = "roygb";
    }

    if( !params.domain ){
        this.domain = [ 0, this.structure.atomStore.count ];
    }

    var atomindexScale = this.getScale();

    this.atomColor = function( a ){

        return atomindexScale( a.index );

    };

};

NGL.AtomindexColorMaker.prototype = NGL.ColorMaker.prototype;

NGL.AtomindexColorMaker.prototype.constructor = NGL.AtomindexColorMaker;


NGL.ResidueindexColorMaker = function( params ){

    NGL.ColorMaker.call( this, params );

    if( !params.scale ){
        this.scale = "roygb";
    }

    if( !params.domain ){
        this.domain = [ 0, this.structure.residueStore.count ];
    }

    var residueindexScale = this.getScale();

    this.atomColor = function( a ){

        return residueindexScale( a.residue.index );

    };

};

NGL.ResidueindexColorMaker.prototype = NGL.ColorMaker.prototype;

NGL.ResidueindexColorMaker.prototype.constructor = NGL.ResidueindexColorMaker;


NGL.ChainindexColorMaker = function( params ){

    NGL.ColorMaker.call( this, params );

    if( !params.scale ){
        this.scale = "Spectral";
    }

    if( !params.domain ){
        this.domain = [ 0, this.structure.chainStore.count ];
    }

    var chainindexScale = this.getScale();

    var chainNames = "ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
                      "abcdefghijklmnopqrstuvwxyz" +
                      "0123456789";

    var chainnameScale = this.getScale( { domain: [ 0, 26 ] } );

    this.atomColor = function( a ){

        if( a.residue.chain.chainname === "" ){
            return chainnameScale(
                chainNames.indexOf( a.chainname ) * 10
            );
        }else{
            return chainindexScale( a.residue.chain.index );
        }

    };

};

NGL.ChainindexColorMaker.prototype = NGL.ColorMaker.prototype;

NGL.ChainindexColorMaker.prototype.constructor = NGL.ChainindexColorMaker;


NGL.ModelindexColorMaker = function( params ){

    NGL.ColorMaker.call( this, params );

    if( !params.scale ){
        this.scale = "roygb";
    }

    if( !params.domain ){
        this.domain = [ 0, this.structure.modelStore.count ];
    }

    var modelindexScale = this.getScale();

    this.atomColor = function( a ){

        return modelindexScale( a.residue.chain.model.index );

    };

};

NGL.ModelindexColorMaker.prototype = NGL.ColorMaker.prototype;

NGL.ModelindexColorMaker.prototype.constructor = NGL.ModelindexColorMaker;


NGL.SstrucColorMaker = function( params ){

    NGL.ColorMaker.call( this, params );

    var strucColors = NGL.StructureColors;
    var defaultStrucColor = NGL.StructureColors[""];
    var rp = this.structure.getResidueProxy();

    this.atomColor = function( ap ){

        rp.index = ap.residueIndex;

        if( rp.sstruc === "h" ){
            return strucColors[ "alphaHelix" ];
        }else if( rp.sstruc === "g" ){
            return strucColors[ "3_10Helix" ];
        }else if( rp.sstruc === "i" ){
            return strucColors[ "piHelix" ];
        }else if( rp.sstruc === "e" || rp.sstruc === "b" ){
            return strucColors[ "betaStrand" ];
        }else if( rp.isNucleic() ){
            return strucColors[ "dna" ];
        }else if( rp.isProtein() || rp.sstruc === "s" || rp.sstruc === "t" || rp.sstruc === "l" ){
            return strucColors[ "coil" ];
        }else{
            return defaultStrucColor;
        }

    };

};

NGL.SstrucColorMaker.prototype = NGL.ColorMaker.prototype;

NGL.SstrucColorMaker.prototype.constructor = NGL.SstrucColorMaker;


NGL.ElementColorMaker = function( params ){

    NGL.ColorMaker.call( this, params );

    var elemColors = NGL.ElementColors;
    var defaultElemColor = NGL.ElementColors[""];
    var colorValue = this.value;
    if( params.value === undefined ){
        colorValue = NGL.ElementColors[ "C" ];
    }

    this.atomColor = function( a ){

        var element = a.element;

        if( element === "C" ){
            return colorValue;
        }else{
            return elemColors[ element ] || defaultElemColor;
        }

    };

};

NGL.ElementColorMaker.prototype = NGL.ColorMaker.prototype;

NGL.ElementColorMaker.prototype.constructor = NGL.ElementColorMaker;


NGL.ResnameColorMaker = function( params ){

    NGL.ColorMaker.call( this, params );

    var resColors = NGL.ResidueColors;
    var defaultResColor = NGL.ResidueColors[""];

    this.atomColor = function( a ){

        return resColors[ a.resname ] || defaultResColor;

    };

};

NGL.ResnameColorMaker.prototype = NGL.ColorMaker.prototype;

NGL.ResnameColorMaker.prototype.constructor = NGL.ResnameColorMaker;


NGL.BfactorColorMaker = function( params ){

    NGL.ColorMaker.call( this, params );

    if( !params.scale ){
        this.scale = "OrRd";
    }

    if( !params.domain ){

        var selection;
        var min = Infinity;
        var max = -Infinity;

        if( params.sele ){
            selection = new NGL.Selection( params.sele );
        }

        this.structure.eachAtom( function( a ){
            var bfactor = a.bfactor;
            min = Math.min( min, bfactor );
            max = Math.max( max, bfactor );
        }, selection );

        this.domain = [ min, max ];

    }

    var bfactorScale = this.getScale();

    this.atomColor = function( a ){

        return bfactorScale( a.bfactor );

    };

};

NGL.BfactorColorMaker.prototype = NGL.ColorMaker.prototype;

NGL.BfactorColorMaker.prototype.constructor = NGL.BfactorColorMaker;


NGL.HydrophobicityColorMaker = function( params ){

    NGL.ColorMaker.call( this, params );

    if( !params.scale ){
        this.scale = "RdYlGn";
    }

    var idx = 0;  // 0: DGwif, 1: DGwoct, 2: Oct-IF

    var resHF = {};
    for( var name in NGL.ResidueHydrophobicity ){
        resHF[ name ] = NGL.ResidueHydrophobicity[ name ][ idx ];
    }
    var defaultResHF = resHF[""];

    if( !params.domain ){

        var val;
        var min = Infinity;
        var max = -Infinity;

        for( var name in resHF ){

            val = resHF[ name ];
            min = Math.min( min, val );
            max = Math.max( max, val );

        }

        this.domain = [ min, 0, max ];

    }

    var hfScale = this.getScale();

    this.atomColor = function( a ){

        return hfScale( resHF[ a.resname ] || defaultResHF );

    };

};

NGL.HydrophobicityColorMaker.prototype = NGL.ColorMaker.prototype;

NGL.HydrophobicityColorMaker.prototype.constructor = NGL.HydrophobicityColorMaker;


NGL.ColorMakerRegistry.types = {

    "": NGL.ColorMaker,
    "picking": NGL.PickingColorMaker,
    "random": NGL.RandomColorMaker,
    "uniform": NGL.UniformColorMaker,
    "atomindex": NGL.AtomindexColorMaker,
    "residueindex": NGL.ResidueindexColorMaker,
    "chainindex": NGL.ChainindexColorMaker,
    "modelindex": NGL.ModelindexColorMaker,
    "sstruc": NGL.SstrucColorMaker,
    "element": NGL.ElementColorMaker,
    "resname": NGL.ResnameColorMaker,
    "bfactor": NGL.BfactorColorMaker,
    "hydrophobicity": NGL.HydrophobicityColorMaker,
    "value": NGL.ValueColorMaker,

};


////////////
// Factory

NGL.RadiusFactory = function( type, scale ){

    this.type = type;
    this.scale = scale || 1.0;

    this.max = 10;

};

NGL.RadiusFactory.types = {

    "": "",
    "vdw": "by vdW radius",
    "covalent": "by covalent radius",
    "sstruc": "by secondary structure",
    "bfactor": "by bfactor",
    "size": "size"

};

NGL.RadiusFactory.prototype = {

    constructor: NGL.RadiusFactory,

    atomRadius: function( a ){

        var type = this.type;
        var scale = this.scale;
        var vdwRadii = NGL.VdwRadii;
        var covalentRadii = NGL.CovalentRadii;

        var defaultVdwRadius = NGL.VdwRadii[""];
        var defaultCovalentRadius = NGL.CovalentRadii[""];
        var defaultBfactor = 1;

        var nucleic = [ "C3'", "C3*", "C4'", "C4*", "P" ];

        var r;

        switch( type ){

            case "vdw":

                r = vdwRadii[ a.element ] || defaultVdwRadius;
                break;

            case "covalent":

                r = covalentRadii[ a.element ] || defaultCovalentRadius;
                break;

            case "bfactor":

                r = a.bfactor || defaultBfactor;
                break;

            case "sstruc":

                if( a.sstruc === "h" ){
                    r = 0.25;
                }else if( a.sstruc === "g" ){
                    r = 0.25;
                }else if( a.sstruc === "i" ){
                    r = 0.25;
                }else if( a.sstruc === "e" ){
                    r = 0.25;
                }else if( a.sstruc === "b" ){
                    r = 0.25;
                // }else if( a.atomname === "P" ){
                }else if( nucleic.indexOf( a.atomname ) !== -1 ){
                    r = 0.4;
                }else{
                    r = 0.1;
                }
                break;

            default:

                r = type || 1.0;
                break;

        }

        return Math.min( r * scale, this.max );

    }

};


NGL.LabelFactory = function( type, text ){

    this.type = type;
    this.text = text || {};

};

NGL.LabelFactory.types = {

    "": "",
    "atomname": "atom name",
    "atomindex": "atom index",
    "atom": "atom name + index",
    "resname": "residue name",
    "resno": "residue no",
    "res": "residue name + no",
    "text": "text"

};

NGL.LabelFactory.prototype = {

    constructor: NGL.LabelFactory,

    atomLabel: function( a ){

        var type = this.type;

        var l;

        switch( type ){

            case "atomname":

                l = a.atomname;
                break;

            case "atomindex":

                l = "" + a.index;
                break;

            case "atom":

                l = a.atomname + "|" + a.index;
                break;

            case "resname":

                l = a.resname;
                break;

            case "resno":

                l = "" + a.resno;
                break;

            case "res":

                l = ( NGL.AA1[ a.resname.toUpperCase() ] || '' ) + a.resno;
                break;

            case "text":

                // TODO
                l = this.text[ a.globalindex ];
                break;

            default:

                l = a.qualifiedName();
                break;

        }

        return l === undefined ? '' : l;

    }

};


//////////////
// Structure

NGL.Structure = function( name, path ){

    this.name = name;
    this.path = path;
    this.title = "";
    this.id = "";

    this.biomolDict = {};
    this.defaultAssembly = "BU1";
    this.helices = [];
    this.sheets = [];

    this.frames = [];
    this.boxes = [];

    this.bondStore = new NGL.BondStore( 0 );
    this.atomStore = new NGL.AtomStore( 0 );
    this.residueStore = new NGL.ResidueStore( 0 );
    this.chainStore = new NGL.ChainStore( 0 );
    this.modelStore = new NGL.ModelStore( 0 );

    this.center = new THREE.Vector3();
    this.boundingBox = new THREE.Box3();

    this.reset();

    NGL.GidPool.addObject( this );

};

NGL.Structure.prototype = {

    constructor: NGL.Structure,

    type: "Structure",

    reset: function(){

        this.biomolDict = {};
        this.helices.length = 0;
        this.sheets.length = 0;
        this.unitcell = new NGL.Unitcell();

        this.frames.length = 0;
        this.boxes.length = 0;

        this.bondStore.clear();
        this.atomStore.clear();
        this.residueStore.clear();
        this.chainStore.clear();
        this.modelStore.clear();

        this.center.set( 0, 0, 0 );
        this.boundingBox.makeEmpty();

        this.atomBitSet = this.getAtomBitSet();
        this.bondBitSet = this.getBondBitSet();

        NGL.GidPool.updateObject( this, true );

    },

    getBondProxy: function( index ){

        return new NGL.BondProxy( this, index );

    },

    getAtomProxy: function( index, tmp ){

        if( tmp ){
            if( this.__tmpAtomProxy === undefined ){
                this.__tmpAtomProxy = new NGL.AtomProxy( this, index );
            }
            return this.__tmpAtomProxy;
        }else{
            return new NGL.AtomProxy( this, index );
        }

    },

    getResidueProxy: function( index ){

        return new NGL.ResidueProxy( this, index );

    },

    getChainProxy: function( index ){

        return new NGL.ChainProxy( this, index );

    },

    getModelProxy: function( index ){

        return new NGL.ModelProxy( this, index );

    },

    getAtomBitSet: function( selection ){

        // caching???

        NGL.time( "NGL.Structure.getAtomBitSet" );

        var n = this.atomStore.count;
        var bs = new TypedFastBitSet( n );
        var ap = this.getAtomProxy();

        if( selection && selection.test ){

            // TODO can be faster by setting ranges of atoms
            //      but for that must loop over hierarchy itself

            // function callback( a ){
            //     bs.add_unsafe( a.index );
            // }

            // if( selection.modelOnlyTest ){

            //     var test = selection.modelOnlyTest;

            //     this.models.forEach( function( m ){
            //         if( test( m ) ) m.eachAtom( callback, selection );
            //     } );

            // }else{

            //     this.models.forEach( function( m ){
            //         m.eachAtom( callback, selection );
            //     } );

            // }

            var test = selection.test;

            for( var i = 0; i < n; ++i ){
                ap.index = i;
                if( test( ap ) ) bs.add_unsafe( ap.index );
            }

        }else{

            bs.set_all( true );

        }

        NGL.timeEnd( "NGL.Structure.getAtomBitSet" );

        return bs;

    },

    getBondBitSet: function( selection ){

        NGL.time( "NGL.Structure.getBondBitSet" );

        var n = this.bondStore.count;
        var bbs = new TypedFastBitSet( n );
        var bp = this.getBondProxy();

        if( selection && selection.test ){

            var abs = this.getAtomBitSet( selection );

            for( var i = 0; i < n; ++i ){
                bp.index = i;
                if( abs.has( bp.atomIndex1 ) && abs.has( bp.atomIndex2 ) ){
                    bbs.add_unsafe( bp.index );
                }
            }

        }else{

            bbs.set_all( true );

        }

        NGL.timeEnd( "NGL.Structure.getBondBitSet" );

        return bbs;

    },

    setSelection: function( selection ){

        this.atomBitSet = this.getAtomBitSet( selection );
        this.bondBitSet = this.getBondBitSet( selection );

    },

    setDefaultAssembly: function( value ){

        this.defaultAssembly = value;

    },

    postProcess: function( callback ){

        this.atomBitSet = this.getAtomBitSet();
        this.boundingBox = this.getBoundingBox();
        this.center = this.boundingBox.center();

        NGL.GidPool.updateObject( this );

    },

    //

    eachAtom: function( callback, selection ){

        var ap = this.getAtomProxy();
        var abs = this.atomBitSet;

        if( selection && selection.test ){
            if( abs ){
                abs = this.getAtomBitSet( selection ).intersection( abs );
            }else{
                abs = this.getAtomBitSet( selection );
            }
        }

        if( abs ){
            abs.forEach( function( index ){
                ap.index = index;
                callback( ap );
            } );
        }else{
            var n = this.atomStore.count;
            for( var i = 0; i < n; ++i ){
                ap.index = i;
                callback( ap );
            }
        }

    },

    eachResidue: function( callback, selection ){

        if( selection && selection.test ){
            var mn = this.modelStore.count;
            var mp = this.getModelProxy();
            if( selection.modelOnlyTest ){
                var modelOnlyTest = selection.modelOnlyTest;
                for( var i = 0; i < mn; ++i ){
                    mp.index = i;
                    if( modelOnlyTest( mp ) ){
                        mp.eachResidue( callback, selection );
                    }
                }
            }else{
                for( var i = 0; i < mn; ++i ){
                    mp.index = i;
                    mp.eachResidue( callback, selection );
                }
            }
        }else{
            var rn = this.residueStore.count;
            var rp = this.getResidueProxy();
            for( var i = 0; i < rn; ++i ){
                rp.index = i;
                callback( rp );
            }
        }

    },

    eachResidueN: function( n, callback ){

        var rn = this.residueStore.count;
        if( rn < n ) return;
        var array = new Array( n );

        for( var i = 0; i < n; ++i ){
            array[ i ] = this.getResidueProxy( i );
        }
        callback.apply( this, array );

        for( var j = n; j < rn; ++j ){
            for( var i = 0; i < n; ++i ){
                array[ i ].index += 1;
            }
            callback.apply( this, array );
        }

    },

    eachFiber: function( callback, selection, padded ){

        if( selection && selection.modelOnlyTest ){

            var test = selection.modelOnlyTest;

            this.models.forEach( function( m ){

                if( test( m ) ) m.eachFiber( callback, selection, padded );

            } );

        }else{

            this.models.forEach( function( m ){

                m.eachFiber( callback, selection, padded );

            } );

        }

    },

    eachChain: function( callback, selection ){

        if( selection && selection.test ){
            var mn = this.modelStore.count;
            var mp = this.getModelProxy();
            if( selection.modelOnlyTest ){
                var modelOnlyTest = selection.modelOnlyTest;
                for( var i = 0; i < mn; ++i ){
                    mp.index = i;
                    if( modelOnlyTest( mp ) ){
                        mp.eachChain( callback, selection );
                    }
                }
            }else{
                for( var i = 0; i < mn; ++i ){
                    mp.index = i;
                    mp.eachChain( callback, selection );
                }
            }
        }else{
            var cn = this.chainStore.count;
            var cp = this.getChainProxy();
            for( var i = 0; i < cn; ++i ){
                cp.index = i;
                callback( cp );
            }
        }

    },

    eachModel: function( callback, selection ){

        var n = this.modelStore.count;
        var mp = this.getModelProxy();

        if( selection && selection.modelOnlyTest ){
            var modelOnlyTest = selection.modelOnlyTest;
            for( var i = 0; i < n; ++i ){
                mp.index = i;
                if( modelOnlyTest( mp ) ) callback( mp );
            }
        }else{
            for( var i = 0; i < n; ++i ){
                mp.index = i;
                callback( mp );
            }
        }

    },

    //

    getView: function( selection ){

        return new NGL.StructureView( this, selection );

    },

    getBoundingBox: function( selection ){

        var vec = new THREE.Vector3();
        var box = new THREE.Box3();

        this.eachAtom( function( a ){
            vec.copy( a );
            box.expandByPoint( vec );
        }, selection );

        return box;

    },

    atomCenter: function( selection ){

        return this.getBoundingBox( selection ).center();

    },

    getSequence: function(){

        var seq = [];

        // FIXME nucleic support

        this.eachResidue( function( r ){

            if( r.getAtomByName( "CA" ) ){
                seq.push( r.getResname1() );
            }

        } );

        return seq;

    },

    getAtoms: function( selection, first ){

        var atoms;

        if( selection && selection.test ){

            atoms = [];
            this.eachAtom( function( pa ){
                atoms.push( pa.copy() );
            }, selection );

        }else{

            atoms = this.atoms;

        }

        if( first ){
            // TODO early exit after first atom is found
            return atoms[ 0 ];
        }else{
            return atoms;
        }

    },

    //

    atomPosition: function(){

        var i = 0;
        var position = new Float32Array( this.atomCount * 3 );

        this.eachAtom( function( ap ){
            ap.positionToArray( position, i );
            i += 3;
        } );

        return position;

    },

    getColorMaker: function( params ){

        var p = params || {};
        p.structure = this.structure;
        p.bondStore = this.structure.bondStore;

        return NGL.ColorMakerRegistry.getScheme( p );

    },

    atomColor: function( params ){

        var i = 0;
        var colorMaker = this.getColorMaker( params );
        var color = new Float32Array( this.atomCount * 3 );

        this.eachAtom( function( ap ){
            colorMaker.atomColorToArray( ap, color, i );
            i += 3;
        } );

        return color;

    },

    atomPickingColor: function( params ){

        var p = Object.assign( params || {} );
        p.scheme = "picking";

        return this.atomColor( p );

    },

    atomRadius: function( type, scale ){

        var i = 0;
        var radiusFactory = new NGL.RadiusFactory( type, scale );
        var radius = new Float32Array( this.atomCount );

        this.eachAtom( function( ap ){
            radius[ i ] = radiusFactory.atomRadius( ap );
            i += 1;
        } );

        return radius;

    },

    atomIndex: function(){

        var i = 0;
        var index = new Float32Array( this.atomCount );

        this.eachAtom( function( ap ){
            index[ i ] = ap.index;
        } );

        return index;

    },

    //

    eachBond: function( callback, selection ){

        var bp = this.getBondProxy();
        var bbs = this.bondBitSet;

        if( selection && selection.test ){
            if( bbs ){
                bbs = this.getBondBitSet( selection ).intersection( bbs );
            }else{
                bbs = this.getBondBitSet( selection );
            }
        }

        if( bbs ){
            bbs.forEach( function( index ){
                bp.index = index;
                callback( bp );
            } );
        }else{
            var n = this.atomStore.count;
            for( var i = 0; i < n; ++i ){
                bp.index = i;
                callback( bp );
            }
        }

    },

    bondPosition: function( fromTo ){

        // NGL.time( "NGL.AtomSet.bondPosition" );

        var position = new Float32Array( this.bondCount * 3 );
        var ap = this.getAtomProxy();
        var i = 0;

        this.eachBond( function( bp ){
            ap.index = fromTo ? bp.atomIndex1 : bp.atomIndex2;
            ap.positionToArray( position, i );
            i += 3;
        } );

        // NGL.timeEnd( "NGL.AtomSet.bondPosition" );

        return position;

    },

    bondColor: function( fromTo, params ){

        // NGL.time( "NGL.AtomSet.bondColor" );

        var colorMaker = this.getColorMaker( params );
        var color = new Float32Array( this.bondCount * 3 );
        var i = 0;

        this.eachBond( function( bp ){
            colorMaker.bondColorToArray( bp, fromTo, color, i );
            i += 3;
        } );

        // NGL.timeEnd( "NGL.AtomSet.bondColor" );

        return color;

    },

    bondPickingColor: function( fromTo, params ){

        var p = Object.assign( {}, params );
        p.scheme = "picking";

        return this.bondColor( fromTo, p );

    },

    bondRadius: function( fromTo, type, scale ){

        // NGL.time( "NGL.AtomSet.bondRadius" );

        var radiusFactory = new NGL.RadiusFactory( type, scale );
        var radius = new Float32Array( this.bondCount );
        var ap = this.getAtomProxy();
        var i = 0;

        this.eachBond( function( bp ){
            ap.index = fromTo ? bp.atomIndex1 : bp.atomIndex2;
            radius[ i ] = radiusFactory.atomRadius( ap );
            i += 1;
        } );

        // NGL.timeEnd( "NGL.AtomSet.bondRadius" );

        return radius;

    },

    //

    updatePosition: function( position ){

        var i = 0;

        this.eachAtom( function( ap ){
            ap.positionToArray( position, i );
            i += 3;
        } );

    },

    //

    toJSON: function(){

        NGL.time( "NGL.Structure.toJSON" );

        var output = {

            metadata: {
                version: 0.1,
                type: 'Structure',
                generator: 'StructureExporter'
            },

            name: this.name,
            path: this.path,
            title: this.title,
            id: this.id,

            biomolDict: this.biomolDict,
            helices: this.helices,
            sheets: this.sheets,
            unitcell: this.unitcell.toJSON(),

            frames: this.frames,
            boxes: this.boxes,

            center: this.center.toArray(),
            boundingBox: [
                this.boundingBox.min.toArray(),
                this.boundingBox.max.toArray()
            ],

            bondStore: this.bondStore.toJSON(),
            atomStore: this.atomStore.toJSON(),
            residueStore: this.residueStore.toJSON(),
            chainStore: this.chainStore.toJSON(),
            modelStore: this.modelStore.toJSON(),

            atomBitSet: this.atomBitSet.toJSON(),
            bondBitSet: this.bondBitSet.toJSON(),

        };

        NGL.timeEnd( "NGL.Structure.toJSON" );

        return output;

    },

    fromJSON: function( input ){

        NGL.time( "NGL.Structure.fromJSON" );

        this.reset();

        this.name = input.name;
        this.path = input.path;
        this.title = input.title;
        this.id = input.id;

        this.biomolDict = input.biomolDict;
        this.helices = input.helices;
        this.sheets = input.sheets;
        this.unitcell = new NGL.Unitcell().fromJSON( input.unitcell );

        this.frames = input.frames;
        this.boxes = input.boxes;

        this.center = new THREE.Vector3().fromArray( input.center );
        this.boundingBox = new THREE.Box3(
            new THREE.Vector3().fromArray( input.boundingBox[ 0 ] ),
            new THREE.Vector3().fromArray( input.boundingBox[ 1 ] )
        );

        this.bondStore.fromJSON( input.bondStore );
        this.atomStore.fromJSON( input.atomStore );
        this.residueStore.fromJSON( input.residueStore );
        this.chainStore.fromJSON( input.chainStore );
        this.modelStore.fromJSON( input.modelStore );

        this.atomBitSet.fromJSON( input.atomBitSet );
        this.bondBitSet.fromJSON( input.bondBitSet );

        NGL.GidPool.updateObject( this );

        NGL.timeEnd( "NGL.Structure.fromJSON" );

        return this;

    },

    getTransferable: function(){

        var transferable = [];

        transferable.concat( this.bondStore.getTransferable() );
        transferable.concat( this.atomStore.getTransferable() );
        transferable.concat( this.residueStore.getTransferable() );
        transferable.concat( this.chainStore.getTransferable() );
        transferable.concat( this.modelStore.getTransferable() );

        if( this.frames ){
            var frames = this.frames;
            var n = this.frames.length;
            for( var i = 0; i < n; ++i ){
                transferable.push( frames[ i ].buffer );
            }
        }
        if( this.boxes ){
            var boxes = this.boxes;
            var n = this.boxes.length;
            for( var i = 0; i < n; ++i ){
                transferable.push( boxes[ i ].buffer );
            }
        }

        if( this.atomBitSet ){
            transferable.concat( this.atomBitSet.getTransferable() );
        }
        if( this.bondBitSet ){
            transferable.concat( this.bondBitSet.getTransferable() );
        }

        return transferable;

    },

    dispose: function(){

        NGL.GidPool.removeObject( this );

        if( this.frames ) this.frames.length = 0;
        if( this.boxes ) this.boxes.length = 0;

        this.atomStore.dispose();
        this.bondStore.dispose();
        this.residueStore.dispose();
        this.chainStore.dispose();
        this.modelStore.dispose();

        delete this.atomStore;
        delete this.bondStore;
        delete this.residueStore;
        delete this.chainStore;
        delete this.modelStore;

        delete this.frames;
        delete this.boxes;
        delete this.cif;

        delete this.atomBitSet;
        delete this.bondBitSet;

    }

};


NGL.StructureView = function( structure, selection ){

    this.structure = structure;
    this.selection = selection;

    Object.defineProperties( this, {
        bondStore: {
            get: function(){ return this.structure.bondStore }
        },
        atomStore: {
            get: function(){ return this.structure.atomStore }
        },
        residueStore: {
            get: function(){ return this.structure.residueStore }
        },
        chainStore: {
            get: function(){ return this.structure.chainStore }
        },
        modelStore: {
            get: function(){ return this.structure.modelStore }
        }
    } );

    if( selection ){
        this.selection.signals.stringChanged.add( function( string ){
            this.applySelection();
        }, this );
        this.applySelection();
    }

};

NGL.StructureView.prototype = NGL.createObject(

    NGL.Structure.prototype, {

    constructor: NGL.StructureView,
    type: "StructureView",

    getView: function(){

        NGL.warning( "You can not get a view from a StructureView." );

    },

    getBondProxy: function(){

        return this.structure.getBondProxy();

    },

    getAtomProxy: function(){

        return this.structure.getAtomProxy();

    },

    getResidueProxy: function(){

        return this.structure.getResidueProxy();

    },

    getChainProxy: function(){

        return this.structure.getChainProxy();

    },

    getModelProxy: function(){

        return this.structure.getModelProxy();

    },

    applySelection: function(){

        NGL.time( "NGL.StructureView.applySelection" );

        this.atomBitSet = this.structure.getAtomBitSet( this.selection );
        this.bondBitSet = this.structure.getBondBitSet( this.selection );

        this.atomCount = this.atomBitSet.size();
        this.bondCount = this.bondBitSet.size();

        this.center = this.atomCenter();

        NGL.timeEnd( "NGL.StructureView.applySelection" );

    },

    eachAtom: function( callback, selection ){

        var ap = this.getAtomProxy();
        var abs = this.atomBitSet.clone();

        if( selection && selection.test ){
            abs = this.structure.getAtomBitSet( selection ).intersection( abs );
        }

        if( this.structure.atomBitSet ){
            abs = abs.intersection( this.structure.atomBitSet );
        }

        abs.forEach( function( index ){
            ap.index = index;
            callback( ap );
        } );

    },

    eachBond: function( callback, selection ){

        var bp = this.getBondProxy();
        var bbs = this.bondBitSet.clone();

        if( selection && selection.test ){
            bbs = this.structure.getBondBitSet( selection ).intersection( bbs );
        }
        if( this.structure.bondBitSet ){
            bbs = bbs.intersection( this.structure.bondBitSet );
        }

        bbs.forEach( function( index ){
            bp.index = index;
            callback( bp );
        } );

    },

    toJSON: function(){

        var output = {

            metadata: {
                version: 0.1,
                type: 'StructureView',
                generator: 'StructureViewExporter'
            },

            structure: this.structure.toJSON(),

            atomBitSet: this.atomBitSet.toJSON(),
            bondBitSet: this.bondBitSet.toJSON(),

            atomCount: this.atomCount,
            bondCount: this.bondCount

        };

        return output;

    },

    fromJSON: function( input ){

        this.structure = new NGL.Structure().fromJSON( input.structure );

        this.atomBitSet = new TypedFastBitSet().fromJSON( input.atomBitSet );
        this.bondBitSet = new TypedFastBitSet().fromJSON( input.bondBitSet );

        this.atomCount = input.atomCount;
        this.bondCount = input.bondCount;

        return this;

    },

    dispose: function(){

        delete this.structure;

        delete this.atomBitSet;
        delete this.bondBitSet;

        delete this.atomCount;
        delete this.bondCount;

    }

} );


NGL.Fiber = function( residues, structure ){

    this.structure = structure;

    this.residues = residues;
    this.residueCount = residues.length;

    if( !this.isProtein() &&
        !this.isNucleic() &&
        !this.isCg()
    ){

        NGL.error( "NGL.fiber: could not determine molecule type" );

    }

    this.computedAtoms = {};

};

NGL.Fiber.prototype = {

    constructor: NGL.Fiber,

    // eachAtom: NGL.Chain.prototype.eachAtom,

    // eachResidue: NGL.Chain.prototype.eachResidue,

    // eachResidueN: NGL.Chain.prototype.eachResidueN,

    isProtein: function(){

        return this.residues[ 0 ].isProtein();

    },

    isCg: function(){

        return this.residues[ 0 ].isCg();

    },

    isNucleic: function(){

        return this.residues[ 0 ].isNucleic();

    },

    getType: function(){

        return this.residues[ 0 ].getType();

    },

    getBackboneType: function( position ){

        return this.residues[ 0 ].getBackboneType( position );

    },

    computeAtom: function( type ){

        var getAtomFn;

        switch( type ){

            case "trace":

                getAtomFn = function( r ){
                    return r.getTraceAtom();
                }
                break;

            case "direction1":

                getAtomFn = function( r ){
                    return r.getDirectionAtom1();
                }
                break;

            case "direction2":

                getAtomFn = function( r ){
                    return r.getDirectionAtom2();
                }
                break;

            default:

                getAtomFn = function( r ){
                    return r.getAtomByName( type );
                }
                return;

        }

        var n = this.residueCount;

        if( !this.computedAtoms[ type ] ){

            this.computedAtoms[ type ] = new Array( n );

        }

        var ca = this.computedAtoms[ type ];

        for( var i = 0, r; i < n; ++i ){

            ca[ i ] = getAtomFn( this.residues[ i ] );

        }

    },

    eachAtomN: function( n, callback, type ){

        if( this.residues.length < n ) return;

        if( !this.computedAtoms[ type ] ) this.computeAtom( type );

        var atoms = this.computedAtoms[ type ];
        var array = new Array( n );
        var len = atoms.length;
        var i;

        for( i = 0; i < n; i++ ){

            array[ i ] = atoms[ i ];

        }

        callback.apply( this, array );

        for( i = n; i < len; i++ ){

            array.shift();
            array.push( atoms[ i ] );

            callback.apply( this, array );

        }

    }

};