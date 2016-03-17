/**
 * @file Geometry
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 */


///////////
// Spline

NGL.Spline = function( polymer, arrows ){

    this.arrows = arrows || false;

    this.polymer = polymer;
    this.size = polymer.residueCount;

    this.tension = this.polymer.isNucleic() ? 0.5 : 0.9;

};

NGL.Spline.prototype = {

    constructor: NGL.Spline,

    // from THREE.js
    // ASR added tension
    interpolate: function( p0, p1, p2, p3, t, tension ) {

        var v0 = ( p2 - p0 ) * tension;
        var v1 = ( p3 - p1 ) * tension;
        var t2 = t * t;
        var t3 = t * t2;
        return ( 2 * p1 - 2 * p2 + v0 + v1 ) * t3 +
               ( -3 * p1 + 3 * p2 - 2 * v0 - v1 ) * t2 +
               v0 * t + p1;

    },

    getSubdividedColor: function( m, params ){

        var interpolate = this.interpolate;
        var polymer = this.polymer;
        var structure = polymer.structure;
        var residueStore = structure.residueStore;
        var residueIndexStart = polymer.residueIndexStart;
        var traceAtomIndex = residueStore.traceAtomIndex;

        var n = polymer.residueCount;
        var n1 = n - 1;
        var nCol = n1 * m * 3 + 3;
        if( polymer.isCyclic ) nCol += m * 3;

        var col = new Float32Array( nCol );
        var pcol = new Float32Array( nCol );

        var p = params || {};
        p.structure = structure;

        var colorMaker = NGL.ColorMakerRegistry.getScheme( p );
        var pickingColorMaker = NGL.ColorMakerRegistry.getPickingScheme( p );

        var k = 0;

        var rp = structure.getResidueProxy();
        rp.index = residueIndexStart;
        var ap1 = structure.getAtomProxy();
        var ap2 = structure.getAtomProxy( rp.traceAtomIndex );

        for( var i = 0; i < n1; ++i ){

            rp.index = residueIndexStart + i + 1;
            ap1.index = ap2.index;
            ap2.index = rp.traceAtomIndex;

            var mh = Math.ceil( m / 2 );

            for( var j = 0; j < mh; ++j ){
                var l = k + j * 3;
                colorMaker.atomColorToArray( ap1, col, l );
                pickingColorMaker.atomColorToArray( ap1, pcol, l );
            }

            for( var j = mh; j < m; ++j ){
                var l = k + j * 3;
                colorMaker.atomColorToArray( ap2, col, l );
                pickingColorMaker.atomColorToArray( ap2, pcol, l );
            }

            k += 3 * m;

        }

        if( polymer.isCyclic ){

            rp.index = residueIndexStart;
            ap1.index = ap2.index;
            ap2.index = rp.traceAtomIndex;

            var mh = Math.ceil( m / 2 );

            for( var j = 0; j < mh; ++j ){
                var l = k + j * 3;
                colorMaker.atomColorToArray( ap1, col, l );
                pickingColorMaker.atomColorToArray( ap1, pcol, l );
            }

            for( var j = mh; j < m; ++j ){
                var l = k + j * 3;
                colorMaker.atomColorToArray( ap2, col, l );
                pickingColorMaker.atomColorToArray( ap2, pcol, l );
            }

            k += 3 * m;

        }

        col[ nCol - 3 ] = col[ nCol - 6 ];
        col[ nCol - 2 ] = col[ nCol - 5 ];
        col[ nCol - 1 ] = col[ nCol - 4 ];

        pcol[ nCol - 3 ] = pcol[ nCol - 6 ];
        pcol[ nCol - 2 ] = pcol[ nCol - 5 ];
        pcol[ nCol - 1 ] = pcol[ nCol - 4 ];

        return {
            "color": col,
            "pickingColor": pcol
        };

    },

    getSubdividedPosition: function( m, tension ){

        if( isNaN( tension ) ) tension = this.tension;

        var pos = this.getPosition( m, tension );

        return {
            "position": pos
        }

    },

    getSubdividedOrientation: function( m, tension ){

        if( isNaN( tension ) ) tension = this.tension;

        var tan = this.getTangent( m, tension );
        var normals = this.getNormals( m, tension, tan );

        return {
            "tangent": tan,
            "normal": normals.normal,
            "binormal": normals.binormal
        }

    },

    getSubdividedSize: function( m, type, scale ){

        var polymer = this.polymer;
        var structure = polymer.structure;
        var residueStore = structure.residueStore;
        var residueIndexStart = polymer.residueIndexStart;
        var traceAtomIndex = residueStore.traceAtomIndex;

        var n = polymer.residueCount;
        var n1 = n - 1;
        var nSize = n1 * m + 1;
        if( polymer.isCyclic ) nSize += m;
        var arrows = this.arrows;

        var size = new Float32Array( nSize );
        var radiusFactory = new NGL.RadiusFactory( type, scale );

        var k = 0;
        var rp = structure.getResidueProxy();
        rp.index = residueIndexStart;
        var ap1 = structure.getAtomProxy();
        var ap2 = structure.getAtomProxy( rp.traceAtomIndex );

        for( var i = 0; i < n1; ++i ){

            rp.index = residueIndexStart + i + 1;
            ap1.index = ap2.index;
            ap2.index = rp.traceAtomIndex;

            var s1 = radiusFactory.atomRadius( ap1 );
            var s2 = radiusFactory.atomRadius( ap2 );

            if( arrows && (
                    ( ap1.sstruc==="e" && ap2.sstruc!=="e" ) ||
                    ( ap1.sstruc==="b" && ap2.sstruc!=="b" ) ||
                    ( ap1.sstruc==="h" && ap2.sstruc!=="h" ) ||
                    ( ap1.sstruc==="g" && ap2.sstruc!=="g" ) ||
                    ( ap1.sstruc==="i" && ap2.sstruc!=="i" )
                )
            ){

                s1 *= 1.7;
                var m2 = Math.ceil( m / 2 );

                for( var j = 0; j < m2; ++j ){
                    // linear interpolation
                    var t = j / m2;
                    size[ k + j ] = ( 1 - t ) * s1 + t * s2;
                }

                for( j = m2; j < m; ++j ){
                    size[ k + j ] = s2;
                }

            }else{

                for( var j = 0; j < m; ++j ){
                    // linear interpolation
                    var t = j / m;
                    size[ k + j ] = ( 1 - t ) * s1 + t * s2;
                }

            }

            k += m;

        }

        if( polymer.isCyclic ){

            rp.index = residueIndexStart;
            ap1.index = ap2.index;
            ap2.index = rp.traceAtomIndex;

            var s1 = radiusFactory.atomRadius( ap1 );
            var s2 = radiusFactory.atomRadius( ap2 );

            if( arrows && (
                    ( ap1.sstruc==="e" && ap2.sstruc!=="e" ) ||
                    ( ap1.sstruc==="b" && ap2.sstruc!=="b" ) ||
                    ( ap1.sstruc==="h" && ap2.sstruc!=="h" ) ||
                    ( ap1.sstruc==="g" && ap2.sstruc!=="g" ) ||
                    ( ap1.sstruc==="i" && ap2.sstruc!=="i" )
                )
            ){

                s1 *= 1.7;
                var m2 = Math.ceil( m / 2 );

                for( var j = 0; j < m2; ++j ){
                    // linear interpolation
                    var t = j / m2;
                    size[ k + j ] = ( 1 - t ) * s1 + t * s2;
                }

                for( j = m2; j < m; ++j ){
                    size[ k + j ] = s2;
                }

            }else{

                for( var j = 0; j < m; ++j ){
                    // linear interpolation
                    var t = j / m;
                    size[ k + j ] = ( 1 - t ) * s1 + t * s2;
                }

            }

            k += m;

        }

        size[ k ] = size[ k - 1 ];

        return {
            "size": size
        };

    },

    getPosition: function( m, tension, atomname ){

        if( isNaN( tension ) ) tension = this.tension;

        var interpolate = this.interpolate;
        var polymer = this.polymer;
        var structure = this.polymer.structure;

        var n = polymer.residueCount;
        var n1 = n - 1;
        var nPos = n1 * m * 3 + 3
        if( polymer.isCyclic ) nPos += m * 3;

        var pos = new Float32Array( nPos );

        var k = 0;
        var dt = 1.0 / m;

        // var rpStart = structure.getResidueProxy( polymer.residueIndexStart );
        // var rpEnd = structure.getResidueProxy( polymer.residueIndexEnd );
        // var rpPrev = rpStart.getPreviousConnectedResidue();
        // var rpNext = rpEnd.getNextConnectedResidue();
        // console.log(rpStart.qualifiedName() ,rpEnd.qualifiedName())

        var type = atomname || "trace";
        var a1 = structure.getAtomProxy();
        var a2 = structure.getAtomProxy( polymer.getAtomIndexByType( -1, type ) );
        var a3 = structure.getAtomProxy( polymer.getAtomIndexByType( 0, type ) );
        var a4 = structure.getAtomProxy( polymer.getAtomIndexByType( 1, type ) );

        for( var i = 0; i < n1; ++i ){

            a1.index = a2.index;
            a2.index = a3.index;
            a3.index = a4.index;
            a4.index = polymer.getAtomIndexByType( i + 2, type );

            for( var j = 0; j < m; ++j ){

                var l = k + j * 3;
                var d = dt * j

                pos[ l + 0 ] = interpolate( a1.x, a2.x, a3.x, a4.x, d, tension );
                pos[ l + 1 ] = interpolate( a1.y, a2.y, a3.y, a4.y, d, tension );
                pos[ l + 2 ] = interpolate( a1.z, a2.z, a3.z, a4.z, d, tension );

            }

            k += 3 * m;

        }

        if( polymer.isCyclic ){

            a1.index = polymer.getAtomIndexByType( polymer.residueCount - 2, type );
            a2.index = polymer.getAtomIndexByType( polymer.residueCount - 1, type );
            a3.index = polymer.getAtomIndexByType( 0, type );
            a4.index = polymer.getAtomIndexByType( 1, type );

            for( var j = 0; j < m; ++j ){

                var l = k + j * 3;
                var d = dt * j

                pos[ l + 0 ] = interpolate( a1.x, a2.x, a3.x, a4.x, d, tension );
                pos[ l + 1 ] = interpolate( a1.y, a2.y, a3.y, a4.y, d, tension );
                pos[ l + 2 ] = interpolate( a1.z, a2.z, a3.z, a4.z, d, tension );

            }

            k += 3 * m;

        }

        a3.positionToArray( pos, k );

        return pos;

    },

    getTangent: function( m, tension, atomname ){

        if( isNaN( tension ) ) tension = this.tension;

        var interpolate = this.interpolate;
        var polymer = this.polymer;
        var structure = this.polymer.structure;

        var p1 = new THREE.Vector3();
        var p2 = new THREE.Vector3();

        var n = this.size;
        var n1 = n - 1;
        var nTan = n1 * m * 3 + 3
        if( polymer.isCyclic ) nTan += m * 3;

        var tan = new Float32Array( nTan );

        var k = 0;
        var dt = 1.0 / m;
        var delta = 0.0001;

        var type = atomname || "trace";
        var a1 = structure.getAtomProxy();
        var a2 = structure.getAtomProxy( polymer.getAtomIndexByType( -1, type ) );
        var a3 = structure.getAtomProxy( polymer.getAtomIndexByType( 0, type ) );
        var a4 = structure.getAtomProxy( polymer.getAtomIndexByType( 1, type ) );

        for( var i = 0; i < n1; ++i ){

            a1.index = a2.index;
            a2.index = a3.index;
            a3.index = a4.index;
            a4.index = polymer.getAtomIndexByType( i + 2, type );

            for( var j = 0; j < m; ++j ){

                var d = dt * j
                var d1 = d - delta;
                var d2 = d + delta;
                var l = k + j * 3;

                // capping as a precation
                if ( d1 < 0 ) d1 = 0;
                if ( d2 > 1 ) d2 = 1;

                p1.x = interpolate( a1.x, a2.x, a3.x, a4.x, d1, tension );
                p1.y = interpolate( a1.y, a2.y, a3.y, a4.y, d1, tension );
                p1.z = interpolate( a1.z, a2.z, a3.z, a4.z, d1, tension );

                p2.x = interpolate( a1.x, a2.x, a3.x, a4.x, d2, tension );
                p2.y = interpolate( a1.y, a2.y, a3.y, a4.y, d2, tension );
                p2.z = interpolate( a1.z, a2.z, a3.z, a4.z, d2, tension );

                p2.sub( p1 ).normalize();
                p2.toArray( tan, l );

            }

            k += 3 * m;

        }

        if( polymer.isCyclic ){

            a1.index = polymer.getAtomIndexByType( polymer.residueCount - 2, type );
            a2.index = polymer.getAtomIndexByType( polymer.residueCount - 1, type );
            a3.index = polymer.getAtomIndexByType( 0, type );
            a4.index = polymer.getAtomIndexByType( 1, type );

            for( var j = 0; j < m; ++j ){

                var d = dt * j
                var d1 = d - delta;
                var d2 = d + delta;
                var l = k + j * 3;

                // capping as a precation
                if ( d1 < 0 ) d1 = 0;
                if ( d2 > 1 ) d2 = 1;

                p1.x = interpolate( a1.x, a2.x, a3.x, a4.x, d1, tension );
                p1.y = interpolate( a1.y, a2.y, a3.y, a4.y, d1, tension );
                p1.z = interpolate( a1.z, a2.z, a3.z, a4.z, d1, tension );

                p2.x = interpolate( a1.x, a2.x, a3.x, a4.x, d2, tension );
                p2.y = interpolate( a1.y, a2.y, a3.y, a4.y, d2, tension );
                p2.z = interpolate( a1.z, a2.z, a3.z, a4.z, d2, tension );

                p2.sub( p1 ).normalize();
                p2.toArray( tan, l );

            }

            k += 3 * m;

        }

        p2.toArray( tan, k );

        // var o = n1 * m * 3;
        // NGL.Utils.copyArray( tan, tan, o - 3, o, 3 );

        return tan;

    },

    getNormals: function( m, tension, tan ){

        var interpolate = this.interpolate;
        var polymer = this.polymer;
        var isCg = polymer.isCg();
        var isProtein = polymer.isProtein();
        var structure = polymer.structure;

        var n = this.size;
        var n1 = n - 1;
        var nNorm = n1 * m * 3 + 3
        if( polymer.isCyclic ) nNorm += m * 3;

        var norm = new Float32Array( nNorm );
        var bin = new Float32Array( nNorm );

        var p1 = new THREE.Vector3();
        var p2 = new THREE.Vector3();

        var vSub1 = new THREE.Vector3();
        var vSub2 = new THREE.Vector3();
        var vSub3 = new THREE.Vector3();
        var vSub4 = new THREE.Vector3();

        var vDir = new THREE.Vector3();
        var vTan = new THREE.Vector3();
        var vNorm = new THREE.Vector3().set( 0, 0, 1 );
        var vBin = new THREE.Vector3();
        var vBinPrev = new THREE.Vector3();

        var d1a1 = new THREE.Vector3();
        var d1a2 = new THREE.Vector3();
        var d1a3 = new THREE.Vector3();
        var d1a4 = new THREE.Vector3();

        var d2a1 = new THREE.Vector3();
        var d2a2 = new THREE.Vector3();
        var d2a3 = new THREE.Vector3();
        var d2a4 = new THREE.Vector3();

        var k = 0;
        var dt = 1.0 / m;
        var first = true;
        var m2 = Math.ceil( m / 2 );

        if( !isCg ){

            var _d1a1 = structure.getAtomProxy();
            var _d1a2 = structure.getAtomProxy( polymer.getAtomIndexByType( -1, "direction1" ) );
            var _d1a3 = structure.getAtomProxy( polymer.getAtomIndexByType( 0, "direction1" ) );
            var _d1a4 = structure.getAtomProxy( polymer.getAtomIndexByType( 1, "direction1" ) );

            var _d2a1 = structure.getAtomProxy();
            var _d2a2 = structure.getAtomProxy( polymer.getAtomIndexByType( -1, "direction2" ) );
            var _d2a3 = structure.getAtomProxy( polymer.getAtomIndexByType( 0, "direction2" ) );
            var _d2a4 = structure.getAtomProxy( polymer.getAtomIndexByType( 1, "direction2" ) );

        }

        for( var i = 0; i < n1; ++i ){

            if( !isCg ){

                _d1a1.index = _d1a2.index;
                _d1a2.index = _d1a3.index;
                _d1a3.index = _d1a4.index;
                _d1a4.index = polymer.getAtomIndexByType( i + 2, "direction1" );

                _d2a1.index = _d2a2.index;
                _d2a2.index = _d2a3.index;
                _d2a3.index = _d2a4.index;
                _d2a4.index = polymer.getAtomIndexByType( i + 2, "direction2" );

                if( first ){

                    first = false;

                    d1a1.copy( _d1a1 );
                    d1a2.copy( _d1a2 );
                    d1a3.copy( _d1a3 );

                    d2a1.copy( _d2a1 );
                    d2a2.copy( _d2a2 );
                    d2a3.copy( _d2a3 );

                    vSub1.subVectors( d2a1, d1a1 );
                    vSub2.subVectors( d2a2, d1a2 );
                    if( vSub1.dot( vSub2 ) < 0 ){
                        vSub2.multiplyScalar( -1 );
                        d2a2.addVectors( d1a2, vSub2 );
                    }

                    vSub3.subVectors( d2a3, d1a3 );
                    if( vSub2.dot( vSub3 ) < 0 ){
                        vSub3.multiplyScalar( -1 );
                        d2a3.addVectors( d1a3, vSub3 );
                    }

                }else{

                    d1a1.copy( d1a2 );
                    d1a2.copy( d1a3 );
                    d1a3.copy( d1a4 );

                    d2a1.copy( d2a2 );
                    d2a2.copy( d2a3 );
                    d2a3.copy( d2a4 );

                    vSub3.copy( vSub4 );

                }

                d1a4.copy( _d1a4 );
                d2a4.copy( _d2a4 );

                vSub4.subVectors( d2a4, d1a4 );
                if( vSub3.dot( vSub4 ) < 0 ){
                    vSub4.multiplyScalar( -1 );
                    d2a4.addVectors( d1a4, vSub4 );
                }

            }

            for( var j = 0; j < m; ++j ){

                var l = k + j * 3;

                if( isCg ){

                    vDir.copy( vNorm );

                }else{

                    if( isProtein ){
                        // shift half a residue
                        l += m2 * 3;
                    }
                    var d = dt * j

                    p1.x = interpolate( d1a1.x, d1a2.x, d1a3.x, d1a4.x, d, tension );
                    p1.y = interpolate( d1a1.y, d1a2.y, d1a3.y, d1a4.y, d, tension );
                    p1.z = interpolate( d1a1.z, d1a2.z, d1a3.z, d1a4.z, d, tension );

                    p2.x = interpolate( d2a1.x, d2a2.x, d2a3.x, d2a4.x, d, tension );
                    p2.y = interpolate( d2a1.y, d2a2.y, d2a3.y, d2a4.y, d, tension );
                    p2.z = interpolate( d2a1.z, d2a2.z, d2a3.z, d2a4.z, d, tension );

                    vDir.subVectors( p2, p1 ).normalize();

                }

                vTan.fromArray( tan, l );

                vBin.crossVectors( vDir, vTan ).normalize();
                vBin.toArray( bin, l );

                vNorm.crossVectors( vTan, vBin ).normalize();
                vNorm.toArray( norm, l );

            }

            k += 3 * m;

        }

        if( polymer.isCyclic ){

            if( !isCg ){

                _d1a1.index = polymer.getAtomIndexByType( polymer.residueCount - 2, "direction1" );
                _d1a2.index = polymer.getAtomIndexByType( polymer.residueCount - 1, "direction1" );
                _d1a3.index = polymer.getAtomIndexByType( 0, "direction1" );
                _d1a4.index = polymer.getAtomIndexByType( 1, "direction1" );

                _d2a1.index = polymer.getAtomIndexByType( polymer.residueCount - 2, "direction2" );
                _d2a2.index = polymer.getAtomIndexByType( polymer.residueCount - 1, "direction2" );
                _d2a3.index = polymer.getAtomIndexByType( 0, "direction2" );
                _d2a4.index = polymer.getAtomIndexByType( 1, "direction2" );

                if( first ){

                    first = false;

                    d1a1.copy( _d1a1 );
                    d1a2.copy( _d1a2 );
                    d1a3.copy( _d1a3 );

                    d2a1.copy( _d2a1 );
                    d2a2.copy( _d2a2 );
                    d2a3.copy( _d2a3 );

                    vSub1.subVectors( d2a1, d1a1 );
                    vSub2.subVectors( d2a2, d1a2 );
                    if( vSub1.dot( vSub2 ) < 0 ){
                        vSub2.multiplyScalar( -1 );
                        d2a2.addVectors( d1a2, vSub2 );
                    }

                    vSub3.subVectors( d2a3, d1a3 );
                    if( vSub2.dot( vSub3 ) < 0 ){
                        vSub3.multiplyScalar( -1 );
                        d2a3.addVectors( d1a3, vSub3 );
                    }

                }else{

                    d1a1.copy( d1a2 );
                    d1a2.copy( d1a3 );
                    d1a3.copy( d1a4 );

                    d2a1.copy( d2a2 );
                    d2a2.copy( d2a3 );
                    d2a3.copy( d2a4 );

                    vSub3.copy( vSub4 );

                }

                d1a4.copy( _d1a4 );
                d2a4.copy( _d2a4 );

                vSub4.subVectors( d2a4, d1a4 );
                if( vSub3.dot( vSub4 ) < 0 ){
                    vSub4.multiplyScalar( -1 );
                    d2a4.addVectors( d1a4, vSub4 );
                }

            }

            for( var j = 0; j < m; ++j ){

                var l = k + j * 3;

                if( isCg ){

                    vDir.copy( vNorm );

                }else{

                    if( isProtein ){
                        // shift half a residue
                        l += m2 * 3;
                    }
                    var d = dt * j

                    p1.x = interpolate( d1a1.x, d1a2.x, d1a3.x, d1a4.x, d, tension );
                    p1.y = interpolate( d1a1.y, d1a2.y, d1a3.y, d1a4.y, d, tension );
                    p1.z = interpolate( d1a1.z, d1a2.z, d1a3.z, d1a4.z, d, tension );

                    p2.x = interpolate( d2a1.x, d2a2.x, d2a3.x, d2a4.x, d, tension );
                    p2.y = interpolate( d2a1.y, d2a2.y, d2a3.y, d2a4.y, d, tension );
                    p2.z = interpolate( d2a1.z, d2a2.z, d2a3.z, d2a4.z, d, tension );

                    vDir.subVectors( p2, p1 ).normalize();

                }

                vTan.fromArray( tan, l );

                vBin.crossVectors( vDir, vTan ).normalize();
                vBin.toArray( bin, l );

                vNorm.crossVectors( vTan, vBin ).normalize();
                vNorm.toArray( norm, l );

            }

            k += 3 * m;

        }

        if( isProtein ){

            // FIXME shift requires data from one more preceeding residue

            vBin.fromArray( bin, m2 * 3 );
            vNorm.fromArray( norm, m2 * 3 );

            for( j = 0; j < m2; ++j ){
                vBin.toArray( bin, j * 3 );
                vNorm.toArray( norm, j * 3 );
            }

        }else{

            vBin.toArray( bin, k );
            vNorm.toArray( norm, k );

        }

        return {
            "normal": norm,
            "binormal": bin
        }

    }

};


////////////////
// Helixorient

NGL.Helixorient = function( polymer ){

    this.polymer = polymer;

    this.size = polymer.residueCount;

};

NGL.Helixorient.prototype = {

    constructor: NGL.Helixorient,

    getPolymer: function( smooth, padded ){

        // FIXME not adapted for polymer and store

        var center = this.getPosition().center;

        var i, j, a, r, fr, fa;
        var residues = [];
        var n = center.length / 3;
        var fiber = this.fiber;

        if( !fiber.computedAtoms[ "trace" ] ) fiber.computeAtom( "trace" );
        var trace = fiber.computedAtoms[ "trace" ];

        for( i = 0; i < n; ++i ){

            fa = trace[ i ];
            fr = fa.residue;

            r = new NGL.Residue();
            a = new NGL.Atom( r );

            r.atoms.push( a );
            r.atomCount += 1;
            r.resname = fr.resname;
            r.index = fr.index;
            r.chain = fr.chain;

            j = 3 * i;

            a.positionFromArray( center, j );

            if( smooth ){

                var l, k, t;
                var w = Math.min( smooth, i, n - i - 1 );

                for( k = 1; k <= w; ++k ){

                    l = k * 3;
                    t = ( w + 1 - k ) / ( w + 1 );

                    a.x += t * center[ j - l + 0 ] + t * center[ j + l + 0 ];
                    a.y += t * center[ j - l + 1 ] + t * center[ j + l + 1 ];
                    a.z += t * center[ j - l + 2 ] + t * center[ j + l + 2 ];

                }

                a.x /= w + 1;
                a.y /= w + 1;
                a.z /= w + 1;

            }

            a.atomname = fa.atomname;
            a.index = fa.index;
            a.resname = fa.resname;
            a.chainname = fa.chainname;
            a.bfactor = fa.bfactor;
            a.ss = fa.ss;

            residues.push( r );

            if( padded && ( i === 0 || i === n - 1 ) ){
                residues.push( r );
            }

        }

        var f = new NGL.Fiber( residues, fiber.structure );

        return f;

    },

    getColor: function( params ){

        var polymer = this.polymer;
        var structure = polymer.structure;
        var n = polymer.residueCount;
        var residueIndexStart = polymer.residueIndexStart;

        var col = new Float32Array( n * 3 );
        var pcol = new Float32Array( n * 3 );

        var p = params || {};
        p.structure = structure;

        var colorMaker = NGL.ColorMakerRegistry.getScheme( p );
        var pickingColorMaker = NGL.ColorMakerRegistry.getPickingScheme( p );

        var rp = structure.getResidueProxy();
        var ap = structure.getAtomProxy();

        for( var i = 0; i < n; ++i ){

            rp.index = residueIndexStart + i;
            ap.index = rp.traceAtomIndex;

            var i3 = i * 3;
            colorMaker.atomColorToArray( ap, col, i3 );
            pickingColorMaker.atomColorToArray( ap, pcol, i3 );

        }

        return {
            "color": col,
            "pickingColor": pcol
        };

    },

    getSize: function( type, scale ){

        var polymer = this.polymer;
        var structure = polymer.structure;
        var n = polymer.residueCount;
        var residueIndexStart = polymer.residueIndexStart;

        var size = new Float32Array( n );
        var radiusFactory = new NGL.RadiusFactory( type, scale );

        var rp = structure.getResidueProxy();
        var ap = structure.getAtomProxy();

        for( var i = 0; i < n; ++i ){

            rp.index = residueIndexStart + i;
            ap.index = rp.traceAtomIndex;
            size[ i ] = radiusFactory.atomRadius( ap );

        }

        return {
            "size": size
        };

    },

    getPosition: function(){

        var polymer = this.polymer;
        var structure = polymer.structure;
        var n = polymer.residueCount;
        var n3 = n - 3;

        var center = new Float32Array( 3 * n );
        var axis = new Float32Array( 3 * n );
        var diff = new Float32Array( n );
        var radius = new Float32Array( n );
        var rise = new Float32Array( n );
        var twist = new Float32Array( n );
        var resdir = new Float32Array( 3 * n );

        var tmp, j;
        var diff13Length, diff24Length;

        var r12 = new THREE.Vector3();
        var r23 = new THREE.Vector3();
        var r34 = new THREE.Vector3();

        var diff13 = new THREE.Vector3();
        var diff24 = new THREE.Vector3();

        var v1 = new THREE.Vector3();
        var v2 = new THREE.Vector3();

        var _axis = new THREE.Vector3();
        var _prevAxis = new THREE.Vector3();

        var _resdir = new THREE.Vector3();
        var _crossdir = new THREE.Vector3();
        var _center = new THREE.Vector3( 0, 0, 0 );

        var type = "trace";
        var a1 = structure.getAtomProxy();
        var a2 = structure.getAtomProxy( polymer.getAtomIndexByType( 0, type ) );
        var a3 = structure.getAtomProxy( polymer.getAtomIndexByType( 1, type ) );
        var a4 = structure.getAtomProxy( polymer.getAtomIndexByType( 2, type ) );

        for( var i = 0; i < n3; ++i ){

            a1.index = a2.index;
            a2.index = a3.index;
            a3.index = a4.index;
            a4.index = polymer.getAtomIndexByType( i + 3, type );

            j = 3 * i;

            // ported from GROMACS src/tools/gmx_helixorient.c

            r12.subVectors( a2, a1 );
            r23.subVectors( a3, a2 );
            r34.subVectors( a4, a3 );

            diff13.subVectors( r12, r23 );
            diff24.subVectors( r23, r34 );

            _axis.crossVectors( diff13, diff24 ).normalize();
            _axis.toArray( axis, j );

            if( i > 0 ){
                diff[ i ] = _axis.angleTo( _prevAxis );
            }

            tmp = Math.cos( diff13.angleTo( diff24 ) );
            twist[ i ] = 180.0 / Math.PI * Math.acos( tmp );

            diff13Length = diff13.length();
            diff24Length = diff24.length();

            radius[ i ] = (
                Math.sqrt( diff24Length * diff13Length ) /
                // clamp, to avoid instabilities for when
                // angle between diff13 and diff24 is near 0
                Math.max( 2.0, 2.0 * ( 1.0 - tmp ) )
            );

            rise[ i ] = Math.abs( r23.dot( _axis ) );

            //

            v1.copy( diff13 ).multiplyScalar( radius[ i ] / diff13Length );
            v2.copy( diff24 ).multiplyScalar( radius[ i ] / diff24Length );

            v1.subVectors( a2, v1 );
            v2.subVectors( a3, v2 );

            v1.toArray( center, j + 3 );
            v2.toArray( center, j + 6 );

            //

            _resdir.subVectors( a1, _center );
            _resdir.toArray( resdir, j );

            _prevAxis.copy( _axis );
            _center.copy( v1 );

        }

        //

        // calc axis as dir of second and third center pos
        // project first traceAtom onto axis to get first center pos
        v1.fromArray( center, 3 );
        v2.fromArray( center, 6 );
        _axis.subVectors( v1, v2 ).normalize();
        // _center.copy( res[ 0 ].getTraceAtom() );
        a1.index = polymer.getAtomIndexByType( 0, type );
        _center.copy( a1 );
        v1 = NGL.Utils.pointVectorIntersection( _center, v1, _axis );
        v1.toArray( center, 0 );

        // calc first resdir
        _resdir.subVectors( _center, v1 );
        _resdir.toArray( resdir, 0 );

        // calc axis as dir of n-1 and n-2 center pos
        // project last traceAtom onto axis to get last center pos
        v1.fromArray( center, 3 * n - 6 );
        v2.fromArray( center, 3 * n - 9 );
        _axis.subVectors( v1, v2 ).normalize();
        // _center.copy( res[ n - 1 ].getTraceAtom() );
        a1.index = polymer.getAtomIndexByType( n - 1, type );
        _center.copy( a1 );
        v1 = NGL.Utils.pointVectorIntersection( _center, v1, _axis );
        v1.toArray( center, 3 * n - 3 );

        // calc last three resdir
        for( var i = n - 3; i < n; ++i ){

            v1.fromArray( center, 3 * i );
            // _center.copy( res[ i ].getTraceAtom() );
            a1.index = polymer.getAtomIndexByType( i, type );
            _center.copy( a1 );

            _resdir.subVectors( _center, v1 );
            _resdir.toArray( resdir, 3 * i );

        }

        // average measures to define them on the residues

        var resRadius = new Float32Array( n );
        var resTwist = new Float32Array( n );
        var resRise = new Float32Array( n );
        var resBending = new Float32Array( n );

        resRadius[ 1 ] = radius[ 0 ];
        resTwist[ 1 ] = twist[ 0 ];
        resRise[ 1 ] = radius[ 0 ];

        for( var i = 2; i < n - 2; ++i ){

            resRadius[ i ] = 0.5 * ( radius[ i - 2 ] + radius[ i - 1 ] );
            resTwist[ i ] = 0.5 * ( twist[ i - 2 ] + twist[ i - 1 ] );
            resRise[ i ] = 0.5 * ( rise[ i - 2 ] + rise[ i - 1 ] );

            v1.fromArray( axis, 3 * ( i - 2 ) );
            v2.fromArray( axis, 3 * ( i - 1 ) );
            resBending[ i ] = 180.0 / Math.PI * Math.acos( Math.cos( v1.angleTo( v2 ) ) );

        }

        resRadius[ n - 2 ] = radius[ n - 4 ];
        resTwist[ n - 2 ] = twist[ n - 4 ];
        resRise[ n - 2 ] = rise[ n - 4 ];

        // average helix axes to define them on the residues

        var resAxis = new Float32Array( 3 * n );

        NGL.Utils.copyArray( axis, resAxis, 0, 0, 3 );
        NGL.Utils.copyArray( axis, resAxis, 0, 3, 3 );

        for( var i = 2; i < n - 2; ++i ){

            v1.fromArray( axis, 3 * ( i - 2 ) );
            v2.fromArray( axis, 3 * ( i - 1 ) );

            _axis.addVectors( v2, v1 ).multiplyScalar( 0.5 ).normalize();
            _axis.toArray( resAxis, 3 * i );

        }

        NGL.Utils.copyArray( axis, resAxis, 3 * n - 12, 3 * n - 6, 3 );
        NGL.Utils.copyArray( axis, resAxis, 3 * n - 12, 3 * n - 3, 3 );

        return {
            "center": center,
            "axis": resAxis,
            "bending": resBending,
            "radius": resRadius,
            "rise": resRise,
            "twist": resTwist,
            "resdir": resdir,
        };

    }

};


//////////
// Helix

NGL.Helix = function(){

    this.begin = new THREE.Vector3();
    this.end = new THREE.Vector3();
    this.axis = new THREE.Vector3();
    this.center = new THREE.Vector3();

    this.length = 0;

    this.residues = [];
    this.size = 0;

};

NGL.Helix.prototype = {

    constructor: NGL.Helix,

    fromHelixbundleAxis: function(){

        var v = new THREE.Vector3();

        return function( axis, i ){

            this.begin.fromArray( axis.begin, i * 3 );
            this.end.fromArray( axis.end, i * 3 );
            this.axis.fromArray( axis.axis, i * 3 );
            this.center.fromArray( axis.center, i * 3 );

            this.length = v.subVectors( this.begin, this.end ).length();

            this.residues = axis.residue[ i ];
            this.size = this.residues.length;

            return this;

        }

    }(),

    angleTo: function(){

        var v = new THREE.Vector3();

        return function( helix ){

            var s = v.crossVectors( this.axis, helix.axis ).length();
            var c = this.axis.dot( helix.axis );
            var angle = Math.atan2( s, c );

            return c < 0 ? -angle : angle;

        }

    }(),

    distanceTo: function(){

        var x = new THREE.Vector3();
        var y = new THREE.Vector3();
        var c = new THREE.Vector3();

        return function( helix ){

            this.crossingPoints( helix, x, y );

            c.subVectors( y, x );

            return c.length();

        }

    }(),

    crossingPoints: function(){

        var w = new THREE.Vector3();
        var v = new THREE.Vector3();
        var ca = new THREE.Vector3();
        var cb = new THREE.Vector3();

        return function( helix, x, y ){

            // U = A2-A1;
            // V = B2-B1;
            // W = cross(U,V);
            // X = A1 + dot(cross(B1-A1,V),W)/dot(W,W)*U;
            // Y = B1 + dot(cross(B1-A1,U),W)/dot(W,W)*V;
            // d = norm(Y-X);

            if( !x ) x = new THREE.Vector3();
            if( !y ) y = new THREE.Vector3();

            w.crossVectors( this.axis, helix.axis );
            v.subVectors( helix.begin, this.begin );

            var dotWW = w.dot( w );
            var dotA = ca.crossVectors( v, helix.axis ).dot( w );
            var dotB = cb.crossVectors( v, this.axis ).dot( w );

            x.copy( this.axis ).multiplyScalar( dotA / dotWW ).add( this.begin );
            y.copy( helix.axis ).multiplyScalar( dotB / dotWW ).add( helix.begin );

            return [ x, y ];

        }

    }(),

    crossing: function( helix ){

        var data = {};

        var angle = this.angleTo( helix ) / ( Math.PI / 180 );
        var cp = this.crossingPoints( helix );

        var lineContact = (
            NGL.Utils.isPointOnSegment( cp[ 0 ], this.begin, this.end ) &&
            NGL.Utils.isPointOnSegment( cp[ 1 ], helix.begin, helix.end )
        );

        var i1 = NGL.Utils.pointVectorIntersection(
            this.begin, helix.begin, helix.axis
        );
        var i2 = NGL.Utils.pointVectorIntersection(
            this.end, helix.begin, helix.axis
        );
        var i3 = NGL.Utils.pointVectorIntersection(
            helix.begin, this.begin, this.axis
        );
        var i4 = NGL.Utils.pointVectorIntersection(
            helix.end, this.begin, this.axis
        );

        var c1 = NGL.Utils.isPointOnSegment(
            i1, helix.begin, helix.end
        );
        var c2 = NGL.Utils.isPointOnSegment(
            i2, helix.begin, helix.end
        );
        var c3 = NGL.Utils.isPointOnSegment(
            i3, this.begin, this.end
        );
        var c4 = NGL.Utils.isPointOnSegment(
            i4, this.begin, this.end
        );

        var overlap = [ 0, 0, 0, 0 ];

        if( c1 && c2 ){
            overlap[ 0 ] = i1.distanceTo( i2 );
        }
        if( c3 && c4 ){
            overlap[ 1 ] = i3.distanceTo( i4 );
        }
        if( c1 && !c2 ){
            if( i2.distanceTo( helix.begin ) < i2.distanceTo( helix.end ) ){
                overlap[ 2 ] = i1.distanceTo( helix.begin );
            }else{
                overlap[ 2 ] = i1.distanceTo( helix.end );
            }
        }
        if( !c1 && c2 ){
            if( i1.distanceTo( helix.begin ) < i1.distanceTo( helix.end ) ){
                overlap[ 2 ] = i2.distanceTo( helix.begin );
            }else{
                overlap[ 2 ] = i2.distanceTo( helix.end );
            }
        }
        if( c3 && !c4 ){
            if( i4.distanceTo( this.begin ) < i4.distanceTo( this.end ) ){
                overlap[ 3 ] = i3.distanceTo( this.begin );
            }else{
                overlap[ 3 ] = i3.distanceTo( this.end );
            }
        }
        if( !c3 && c4 ){
            if( i3.distanceTo( this.begin ) < i3.distanceTo( this.end ) ){
                overlap[ 3 ] = i4.distanceTo( this.begin );
            }else{
                overlap[ 3 ] = i4.distanceTo( this.end );
            }
        }

        var maxOverlap = Math.max.apply( null, overlap );

        var onSegment = [ c1, c2, c3, c4 ];

        if( !lineContact ){

            var candidates = [];

            if( angle > 120 || angle < 60 ){

                candidates.push( {
                    "distance": this.begin.distanceTo( i1 ),
                    "contact": c1,
                    "p1": this.begin,
                    "p2": i1
                } );

                candidates.push( {
                    "distance": this.end.distanceTo( i2 ),
                    "contact": c2,
                    "p1": this.end,
                    "p2": i2
                } );

                candidates.push( {
                    "distance": helix.begin.distanceTo( i3 ),
                    "contact": c3,
                    "p1": helix.begin,
                    "p2": i3
                } );

                candidates.push( {
                    "distance": helix.end.distanceTo( i4 ),
                    "contact": c4,
                    "p1": helix.end,
                    "p2": i4
                } );

            }

            //

            if( maxOverlap > 0 && ( angle > 120 || angle < 60 ) ){

                candidates.push( {
                    "distance": this.begin.distanceTo( helix.begin ),
                    "contact": true,
                    "p1": this.begin,
                    "p2": helix.begin
                } );

                candidates.push( {
                    "distance": this.begin.distanceTo( helix.end ),
                    "contact": true,
                    "p1": this.begin,
                    "p2": helix.end
                } );

                candidates.push( {
                    "distance": this.end.distanceTo( helix.begin ),
                    "contact": true,
                    "p1": this.end,
                    "p2": helix.begin
                } );

                candidates.push( {
                    "distance": this.end.distanceTo( helix.end ),
                    "contact": true,
                    "p1": this.end,
                    "p2": helix.end
                } );

            }

            //

            data.distance = Infinity;
            candidates.forEach( function( c ){
                if( c.contact && c.distance < data.distance ){
                    data = c;
                }
            } );

        }else{

            data = {
                "distance": this.distanceTo( helix ),
                "contact": true,
                "p1": cp[ 0 ],
                "p2": cp[ 1 ]
            };

        }

        return Object.assign( {
            "distance": Infinity,
            "contact": false,
            "angle": angle,
            "onSegment": onSegment,
            "overlap": overlap,
            "maxOverlap": maxOverlap,
            "lineContact": lineContact
        }, data );

    }

};


////////////////
// Helixbundle

NGL.Helixbundle = function( polymer ){

    this.polymer = polymer;

    this.helixorient = new NGL.Helixorient( polymer );
    this.position = this.helixorient.getPosition();

};

NGL.Helixbundle.prototype = {

    constructor: NGL.Helixbundle,

    getAxis: function( localAngle, centerDist, ssBorder, colorParams, radius, scale ){

        localAngle = localAngle || 30;
        centerDist = centerDist || 2.5;
        ssBorder = ssBorder === undefined ? false : ssBorder;

        var polymer = this.polymer;
        var structure = polymer.structure;
        var n = polymer.residueCount;
        var residueIndexStart = polymer.residueIndexStart;

        var pos = this.position;

        var cp = colorParams || {};
        cp.structure = structure;

        var colorMaker = NGL.ColorMakerRegistry.getScheme( cp );
        var pickingColorMaker = NGL.ColorMakerRegistry.getPickingScheme( cp );

        var radiusFactory = new NGL.RadiusFactory( radius, scale );

        var j = 0;
        var k = 0;

        var axis = [];
        var center = [];
        var beg = [];
        var end = [];
        var col = [];
        var pcol = [];
        var size = [];
        var residueOffset = [];
        var residueCount = [];

        var tmpAxis = [];
        var tmpCenter = [];

        var _axis, _center
        var _beg = new THREE.Vector3();
        var _end = new THREE.Vector3();

        var rp1 = structure.getResidueProxy();
        var rp2 = structure.getResidueProxy();
        var ap = structure.getAtomProxy();

        var c1 = new THREE.Vector3();
        var c2 = new THREE.Vector3();

        var split = false;

        for( var i = 0; i < n; ++i ){

            rp1.index = residueIndexStart + i;
            c1.fromArray( pos.center, i * 3 );

            if( i === n - 1 ){
                split = true;
            }else{

                rp2.index = residueIndexStart + i + 1;
                c2.fromArray( pos.center, i * 3 + 3 );

                if( ssBorder && rp1.sstruc !== rp2.sstruc ){
                    split = true;
                }else if( c1.distanceTo( c2 ) > centerDist ){
                    split = true;
                }else if( pos.bending[ i ] > localAngle ){
                    split = true;
                }

            }

            if( split ){

                if( i - j < 4 ){
                    j = i;
                    split = false;
                    continue;
                }

                ap.index = rp1.traceAtomIndex;

                // ignore first and last axis
                tmpAxis = pos.axis.subarray( j * 3 + 3, i * 3 );
                tmpCenter = pos.center.subarray( j * 3, i * 3 + 3 );

                _axis = NGL.Utils.calculateMeanVector3( tmpAxis ).normalize();
                _center = NGL.Utils.calculateMeanVector3( tmpCenter );

                _beg.fromArray( tmpCenter );
                _beg = NGL.Utils.pointVectorIntersection( _beg, _center, _axis );

                _end.fromArray( tmpCenter, tmpCenter.length - 3 );
                _end = NGL.Utils.pointVectorIntersection( _end, _center, _axis );

                _axis.subVectors( _end, _beg );

                _axis.toArray( axis, k );
                _center.toArray( center, k );
                _beg.toArray( beg, k );
                _end.toArray( end, k );

                colorMaker.atomColorToArray( ap, col, k );
                pickingColorMaker.atomColorToArray( ap, pcol, k );

                size.push( radiusFactory.atomRadius( ap ) );

                residueOffset.push( residueIndexStart + j );
                residueCount.push( residueIndexStart + i + 1 - j );

                k += 3;
                j = i;
                split = false;

            }

        }

        return {
            "axis": new Float32Array( axis ),
            "center": new Float32Array( center ),
            "begin": new Float32Array( beg ),
            "end": new Float32Array( end ),
            "color": new Float32Array( col ),
            "pickingColor": new Float32Array( pcol ),
            "size": new Float32Array( size ),
            "residueOffset": residueOffset,
            "residueCount": residueCount
        };

    }

};


/////////////////
// HelixCrossing

NGL.HelixCrossing = function( helices ){

    this.helices = helices;

};

NGL.HelixCrossing.prototype = {

    constructor: NGL.HelixCrossing,

    getCrossing: function( minDistance ){

        minDistance = minDistance || 12;

        var helices = this.helices;

        var helixLabel = [];
        var helixCenter = [];
        var crossingBeg = [];
        var crossingEnd = [];
        var info = [];

        var k = 0;

        for( var i = 0; i < helices.length; ++i ){

            var h1 = helices[ i ];

            helixLabel.push( "H" + ( i + 1 ) );
            h1.center.toArray( helixCenter, i * 3 );

            for( var j = i + 1; j < helices.length; ++j ){

                var c = h1.crossing( helices[ j ] );

                if( c.contact && c.distance < minDistance ){

                    info.push( {
                        "helix1": i + 1,
                        "helix2": j + 1,
                        "angle": c.angle,
                        "distance": c.distance,
                        "overlap": c.maxOverlap
                    } );

                    c.p1.toArray( crossingBeg, k * 3 );
                    c.p2.toArray( crossingEnd, k * 3 );
                    k += 1;

                }

            }

        }

        return {
            "helixLabel": helixLabel,
            "helixCenter": helixCenter,
            "begin": crossingBeg,
            "end": crossingEnd,
            "info": info
        }

    }

};


///////////
// Kdtree

NGL.Kdtree = function( entity, useSquaredDist ){

    if( NGL.debug ) NGL.time( "NGL.Kdtree build" );

    if( useSquaredDist ){

        var metric = function( a, b ){
            var dx = a[0] - b[0];
            var dy = a[1] - b[1];
            var dz = a[2] - b[2];
            return dx*dx + dy*dy + dz*dz;
        };

    }else{

        var metric = function( a, b ){
            var dx = a[0] - b[0];
            var dy = a[1] - b[1];
            var dz = a[2] - b[2];
            return Math.sqrt( dx*dx + dy*dy + dz*dz );
        };

    }

    var points = new Float32Array( entity.atomCount * 4 );
    var i = 0;

    entity.eachAtom( function( ap ){
        points[ i + 0 ] = ap.x;
        points[ i + 1 ] = ap.y;
        points[ i + 2 ] = ap.z;
        points[ i + 3 ] = ap.index;
        i += 4;
    } );

    this.points = points;
    this.kdtree = new THREE.TypedArrayUtils.Kdtree( points, metric, 4, 3 );

    if( NGL.debug ) NGL.timeEnd( "NGL.Kdtree build" );

};

NGL.Kdtree.prototype = {

    nearest: function(){

        var pointArray = new Float32Array( 3 );

        return function( point, maxNodes, maxDistance ){

            // NGL.time( "NGL.Kdtree nearest" );

            if( point instanceof THREE.Vector3 ){

                point.toArray( pointArray );

            }else if( point instanceof NGL.AtomProxy ){

                point.positionToArray( pointArray );

            }

            var nodeList = this.kdtree.nearest(
                pointArray, maxNodes, maxDistance
            );

            var points = this.points;
            var resultList = [];

            for( var i = 0, n = nodeList.length; i < n; ++i ){

                var d = nodeList[ i ];
                var node = d[ 0 ];
                var dist = d[ 1 ];

                resultList.push( {
                    index: points[ node.pos + 3 ],
                    distance: dist
                } );

            }

            // NGL.timeEnd( "NGL.Kdtree nearest" );

            return resultList;

        };

    }()

};


////////////
// Contact

NGL.Contact = function( sview1, sview2 ){

    this.sview1 = sview1;
    this.sview2 = sview2;

    // this.kdtree1 = new NGL.Kdtree( sview1 );
    this.kdtree2 = new NGL.Kdtree( sview2 );

}

NGL.Contact.prototype = {

    within: function( maxDistance, minDistance ){

        NGL.time( "NGL.Contact within" );

        var kdtree1 = this.kdtree1;
        var kdtree2 = this.kdtree2;

        var ap2 = this.sview1.getAtomProxy();
        var atomSet = this.sview1.getAtomSet( false );
        var bondStore = new NGL.BondStore();

        this.sview1.eachAtom( function( ap1 ){

            var found = false;
            var contacts = kdtree2.nearest(
                ap1, Infinity, maxDistance
            );

            for( var j = 0, m = contacts.length; j < m; ++j ){

                var d = contacts[ j ];
                ap2.index = d.index;

                if( ap1.residueIndex !== ap2.residueIndex &&
                    ( !minDistance || d.distance > minDistance ) ){
                    found = true;
                    atomSet.add_unsafe( ap2.index );
                    bondStore.addBond( ap1, ap2, 1 );
                }

            }

            if( found ){
                atomSet.add_unsafe( ap1.index );
            }

        } );

        var bondSet = new TypedFastBitSet( bondStore.count );
        bondSet.set_all( true );

        NGL.timeEnd( "NGL.Contact within" );

        return {
            atomSet: atomSet,
            bondSet: bondSet,
            bondStore: bondStore
        };

    }

}


NGL.polarContacts = function( structure, maxDistance, maxAngle ){

    maxDistance = maxDistance || 3.5;
    maxAngle = maxAngle || 40;

    var donorSelection = new NGL.Selection(
        "( ARG and ( .NE or .NH1 or .NH2 ) ) or " +
        "( ASP and .ND2 ) or " +
        "( GLN and .NE2 ) or " +
        "( HIS and ( .ND1 or .NE2 ) ) or " +
        "( LYS and .NZ ) or " +
        "( SER and .OG ) or " +
        "( THR and .OG1 ) or " +
        "( TRP and .NE1 ) or " +
        "( TYR and .OH ) or " +
        "( PROTEIN and .N )"
    );

    var acceptorSelection = new NGL.Selection(
        "( ASN and .OD1 ) or " +
        "( ASP and ( OD1 or .OD2 ) ) or " +
        "( GLN and .OE1 ) or " +
        "( GLU and ( .OE1 or .OE2 ) ) or " +
        "( HIS and ( .ND1 or .NE2 ) ) or " +
        "( SER and .OG ) or " +
        "( THR and .OG1 ) or " +
        "( TYR and .OH ) or " +
        "( PROTEIN and .O )"
    );

    var donorView = structure.getView( donorSelection );
    var acceptorView = structure.getView( acceptorSelection );

    var contact = new NGL.Contact( donorView, acceptorView );
    var data = contact.within( maxDistance );
    var bondStore = data.bondStore;

    var ap1 = structure.getAtomProxy();
    var ap2 = structure.getAtomProxy();
    var atomCA = structure.getAtomProxy();
    var atomC = structure.getAtomProxy();
    var rp = structure.getResidueProxy();
    var rpPrev = structure.getResidueProxy();
    var v1 = new THREE.Vector3();
    var v2 = new THREE.Vector3();

    var checkAngle = function( atom1, atom2, oName, cName ){

        var atomO, atomN;

        if( atom1.atomname === oName ){
            atomO = atom1;
            atomN = atom2;
        }else{
            atomO = atom2;
            atomN = atom1;
        }

        rp.index = atomO.residueIndex;
        var atomC = rp.getAtomIndexByName( cName ) + rp.atomOffset;

        v1.subVectors( atomC, atomO );
        v2.subVectors( atomC, atomN );

        return THREE.Math.radToDeg( v1.angleTo( v2 ) ) < maxAngle;

    }

    for( var i = 0, il = bondStore.count; i < il; ++i ){

        ap1.index = bondStore.atomIndex1[ i ];
        ap2.index = bondStore.atomIndex2[ i ];

        if( ( ap1.atomname === "O" && ap2.atomname === "N" ) ||
            ( ap1.atomname === "N" && ap2.atomname === "O" )
        ){

            // ignore backbone to backbone contacts
            data.bondSet.flip_unsafe( i );
            continue;

        }else if( ap1.atomname === "N" || ap2.atomname === "N" ){

            var atomN, atomX;

            if( ap1.atomname === "N" ){
                atomN = ap1;
                atomX = ap2;
            }else{
                atomN = ap2;
                atomX = ap1;
            }

            rp.index = atomN.residueIndex;
            atomCA.index = rp.getAtomIndexByName( "CA" ) + rp.atomOffset;
            if( atomCA.index === undefined ) continue;

            var prevRes = rp.getPreviousConnectedResidue( rpPrev );
            if( prevRes === undefined ) continue;

            atomC.index = prevRes.getAtomIndexByName( "C" ) + prevRes.atomOffset;
            if( atomC.index === undefined ) continue;

            v1.subVectors( atomN, atomC );
            v2.subVectors( atomN, atomCA );
            v1.add( v2 ).multiplyScalar( 0.5 );
            v2.subVectors( atomX, atomN );

            if( THREE.Math.radToDeg( v1.angleTo( v2 ) ) > maxAngle ){
                data.bondSet.flip_unsafe( i );
            }

        }else if(
            ( ap1.atomname === "OH" && ap1.resname === "TYR" ) ||
            ( ap2.atomname === "OH" && ap2.resname === "TYR" )
        ){

            if( !checkAngle( ap1, ap2, "OH", "CZ" ) ){
                data.bondSet.flip_unsafe( i );
            }

        }

    }

    return {
        atomSet: data.atomSet,
        bondSet: data.bondSet,
        bondStore: data.bondStore
    };

}


NGL.polarBackboneContacts = function( structure, maxDistance, maxAngle ){

    maxDistance = maxDistance || 3.5;
    maxAngle = maxAngle || 40;

    var donorSelection = new NGL.Selection(
        "( PROTEIN and .N )"
    );

    var acceptorSelection = new NGL.Selection(
        "( PROTEIN and .O )"
    );

    var donorView = structure.getView( donorSelection );
    var acceptorView = structure.getView( acceptorSelection );

    var contact = new NGL.Contact( donorView, acceptorView );
    var data = contact.within( maxDistance );
    var bondStore = data.bondStore;

    var ap1 = structure.getAtomProxy();
    var ap2 = structure.getAtomProxy();
    var atomCA = structure.getAtomProxy();
    var atomC = structure.getAtomProxy();
    var rp = structure.getResidueProxy();
    var rpPrev = structure.getResidueProxy();
    var v1 = new THREE.Vector3();
    var v2 = new THREE.Vector3();

    for( var i = 0, il = bondStore.count; i < il; ++i ){

        ap1.index = bondStore.atomIndex1[ i ];
        ap2.index = bondStore.atomIndex2[ i ];

        var atomN, atomO;

        if( ap1.atomname === "N" ){
            atomN = ap1;
            atomO = ap2;
        }else{
            atomN = ap2;
            atomO = ap1;
        }

        rp.index = atomN.residueIndex;

        atomCA.index = rp.getAtomIndexByName( "CA" ) + rp.atomOffset;
        if( atomCA.index === undefined ) continue;

        var prevRes = rp.getPreviousConnectedResidue( rpPrev );
        if( prevRes === undefined ) continue;

        atomC.index = prevRes.getAtomIndexByName( "C" ) + prevRes.atomOffset;
        if( atomC.index === undefined ) continue;

        v1.subVectors( atomN, atomC );
        v2.subVectors( atomN, atomCA );
        v1.add( v2 ).multiplyScalar( 0.5 );
        v2.subVectors( atomO, atomN );

        // NGL.log( THREE.Math.radToDeg( v1.angleTo( v2 ) ) );

        if( THREE.Math.radToDeg( v1.angleTo( v2 ) ) > maxAngle ){
            data.bondSet.flip_unsafe( i );
        }

    }

    return {
        atomSet: data.atomSet,
        bondSet: data.bondSet,
        bondStore: data.bondStore
    };

}