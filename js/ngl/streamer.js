/**
 * @file Streamer
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 */


/////////////
// Streamer

NGL.Streamer = function( src, params ){

    var p = params || {};

    this.compressed = p.compressed !== undefined ? p.compressed : false;
    this.binary = p.binary !== undefined ? p.binary : false;

    this.src = src;
    this.chunkSize = 1024 * 1024 * 10;
    this.newline = "\n";

    this.__pointer = 0;
    this.__partialLine = "";

    if( this.__srcName ){
        this[ this.__srcName ] = src;
    }

};

NGL.Streamer.prototype.constructor = NGL.Streamer;

NGL.Streamer.prototype = {

    constructor: NGL.Streamer,

    type: "",

    __srcName: undefined,

    onload: function(){},

    onprogress: function(){},

    onerror: function(){},

    read: function( callback ){

        this._read( function( data ){

            if( this.compressed ){

                NGL.decompressWorker(

                    // TODO find better way to specify compression
                    data, "foo." + this.compressed, true,

                    function( decompressedData ){

                        this.data = decompressedData;
                        if( typeof this.onload === "function" ){
                            this.onload( this.data );
                        }
                        callback();

                    }.bind( this )

                );

            }else{

                if( this.binary && data instanceof ArrayBuffer ){
                    data = new Uint8Array( data );
                }

                this.data = data;
                if( typeof this.onload === "function" ){
                    this.onload( this.data );
                }
                callback();

            }

        }.bind( this ) );

    },

    _read: function( callback ){

        // overwrite this method when this.src does not contain the data

        callback( this.src );

    },

    _chunk: function( start, end ){

        end = Math.min( this.data.length, end );

        if( start === 0 && this.data.length === end ){

            return this.data;

        }else{

            if( this.binary || this.compressed ){
                return this.data.subarray( start, end );
            }else{
                return this.data.substring( start, end );
            }

        }

    },

    chunk: function( start ){

        var end = start + this.chunkSize;

        return this._chunk( start, end );

    },

    peekLines: function( m ){

        var data = this.data;
        var n = data.length;

        // FIXME does not work for multi-char newline
        var newline = ( this.binary || this.compressed ) ? this.newline.charCodeAt( 0 ) : this.newline;

        var i;
        var count = 0;

        for( i = 0; i < n; ++i ){

            if( data[ i ] === newline ) ++count;
            if( count === m ) break;

        }

        var chunk = this._chunk( 0, i + 1 );
        var d = this.chunkToLines( chunk, "", i > n );

        return d.lines;

    },

    lineCount: function(){
        console.warn("lineCount")
        var data = this.data;
        var n = data.length;

        // FIXME does not work for multi-char newline
        var newline = ( this.binary || this.compressed ) ? this.newline.charCodeAt( 0 ) : this.newline;

        var count = 0;
        for( var i = 0; i < n; ++i ){
            if( data[ i ] === newline ) ++count;
        }
        if( data[ n - 1 ] !== newline ) ++count;

        return count;

    },

    chunkCount: function(){

        return Math.floor( this.data.length / this.chunkSize ) + 1;

    },

    asText: function(){

        if( this.binary || this.compressed ){
            return NGL.Uint8ToString( this.data );
        }else{
            return this.data;
        }

    },

    chunkToLines: function( chunk, partialLine, isLast ){

        var newline = this.newline;

        if( !this.binary && !this.compressed && chunk.length === this.data.length ){
            return {
                lines: chunk.split( newline ),
                partialLine: ""
            };
        }

        var str = ( this.binary || this.compressed ) ? NGL.Uint8ToString( chunk ) : chunk;
        var lines = [];
        var idx = str.lastIndexOf( newline );

        if( idx === -1 ){

            partialLine += str;

        }else{

            var str2 = partialLine + str.substr( 0, idx );
            lines = lines.concat( str2.split( newline ) );

            if( idx === str.length - newline.length ){
                partialLine = "";
            }else{
                partialLine = str.substr( idx + newline.length );
            }

        }

        if( isLast && partialLine !== "" ){
            lines.push( partialLine );
        }

        return {
            lines: lines,
            partialLine: partialLine
        };

    },

    nextChunk: function(){

        var start = this.__pointer;

        if( start > this.data.length ){
            return undefined;
        }

        this.__pointer += this.chunkSize;
        return this.chunk( start );

    },

    nextChunkOfLines: function(){

        var chunk = this.nextChunk();

        if( chunk === undefined ){
            return undefined;
        }

        var isLast = this.__pointer > this.data.length;
        var d = this.chunkToLines( chunk, this.__partialLine, isLast );

        this.__partialLine = d.partialLine;

        return d.lines;

    },

    eachChunk: function( callback ){

        var chunkSize = this.chunkSize;
        var n = this.data.length;
        var chunkCount = this.chunkCount();

        for( var i = 0; i < n; i += chunkSize ){

            var chunk = this.chunk( i );
            var chunkNo = Math.round( i / chunkSize );

            callback( chunk, chunkNo, chunkCount );

        }

    },

    eachChunkOfLines: function( callback ){

        var newline = this.newline;

        this.eachChunk( function( chunk, chunkNo, chunkCount ){

            var isLast = chunkNo === chunkCount + 1;
            var d = this.chunkToLines( chunk, this.__partialLine, isLast );

            this.__partialLine = d.partialLine;

            callback( d.lines, chunkNo, chunkCount );

        }.bind( this ) );

    },

    eachChunkOfLinesAsync: function( callback, onfinish ){
        console.warn("eachChunkOfLinesAsync")
        var self = this;
        var n = self.chunkCount();
        var _i = 0;

        function fn(){
            ++_i;
            NGL.processArray(
                self.nextChunkOfLines(),
                callback,
                function(){
                    if( _i >= n ){
                        onfinish();
                    }else{
                        // requestAnimationFrame( fn );
                        setTimeout( fn );
                    }
                }
            );
        }

        fn();

    },

    toJSON: function(){

        var type = this.type.substr( 0, 1 ).toUpperCase() +
                    this.type.substr( 1 );

        var output = {

            metadata: {
                version: 0.1,
                type: type + 'Streamer',
                generator: type + 'StreamerExporter'
            },

            src: this.src,
            compressed: this.compressed,
            binary: this.binary,
            chunkSize: this.chunkSize,
            newline: this.newline,



        }

        if( this.__srcName ){
            output[ this.__srcName ] = this[ this.__srcName ];
        }

        return output;

    },

    fromJSON: function( input ){

        this.src = input.src;
        this.compressed = input.compressed;
        this.binary = input.binary;
        this.chunkSize = input.chunkSize;
        this.newline = input.newline;

        if( this.__srcName ){
            this[ this.__srcName ] = input[ this.__srcName ];
        }

        return this;

    },

    getTransferable: function(){

        var transferable = [];

        return transferable;

    },

    dispose: function(){

        delete this.src;

        if( this.__srcName ){
            delete this[ this.__srcName ];
        }

    }

};


NGL.NetworkStreamer = function( url, params ){

    NGL.Streamer.call( this, url, params );

};

NGL.NetworkStreamer.prototype = NGL.createObject(

    NGL.Streamer.prototype, {

    constructor: NGL.NetworkStreamer,

    type: "network",

    __srcName: "url",

    _read: function( callback ){

        var url = this.src;

        if( typeof importScripts === 'function' ){

            // FIXME
            // adjust relative path when inside a web worker
            if( url.substr( 0, 3 ) === "../" ) url = "../" + url;

        }

        var xhr = new XMLHttpRequest();
        xhr.open( "GET", url, true );

        //

        xhr.addEventListener( 'load', function ( event ) {

            if( xhr.status === 200 || xhr.status === 304 ||
                // when requesting from local file system
                // the status in Google Chrome/Chromium is 0
                xhr.status === 0
             ){

                callback( xhr.response );

            } else {

                if( typeof this.onerror === "function" ){

                    this.onerror( xhr.status );

                }

                throw "NGL.NetworkStreamer._read: status code " + xhr.status;

            }

        }.bind( this ), false );

        //

        // if( typeof this.onprogress === "function" ){

        //     xhr.addEventListener( 'progress', function ( event ) {

        //         this.onprogress( event );

        //     }.bind( this ), false );

        // }

        //

        if( typeof this.onerror === "function" ){

            xhr.addEventListener( 'error', function ( event ) {

                this.onerror( event );

            }.bind( this ), false );

        }

        //

        if( this.compressed || this.binary ){
            xhr.responseType = "arraybuffer";
        }
        // xhr.crossOrigin = true;

        xhr.send( null );

        // try {
        //     xhr.send( null );
        // }catch( e ){
        //     if( typeof this.onerror === "function" ){
        //         this.onerror( e.message );
        //     }
        // }

    }

} );


NGL.FileStreamer = function( file, params ){

    NGL.Streamer.call( this, file, params );

};

NGL.FileStreamer.prototype = NGL.createObject(

    NGL.Streamer.prototype, {

    constructor: NGL.FileStreamer,

    type: "file",

    __srcName: "file",

    _read: function( callback ){

        if( typeof importScripts === 'function' ){

            // Use FileReaderSync within Worker

            var reader = new FileReaderSync();
            var data;
            if( this.binary || this.compressed ){
                data = reader.readAsArrayBuffer( this.file );
            }else{
                data = reader.readAsText( this.file );
            }

            //

            callback( data );

        }else{

            var reader = new FileReader();

            //

            reader.onload = function( event ){

                callback( event.target.result );

            }.bind( this );

            //

            if( typeof this.onprogress === "function" ){

                reader.onprogress = function ( event ) {

                    this.onprogress( event );

                }.bind( this );

            }

            //

            if( typeof this.onerror === "function" ){

                reader.onerror = function ( event ) {

                    this.onerror( event );

                }.bind( this );

            }

            //

            if( this.binary || this.compressed ){
                reader.readAsArrayBuffer( this.file );
            }else{
                reader.readAsText( this.file );
            }

        }

    }

} );


NGL.StringStreamer = function( str, params ){

    NGL.Streamer.call( this, str, params );

};

NGL.StringStreamer.prototype = NGL.createObject(

    NGL.Streamer.prototype, {

    constructor: NGL.StringStreamer,

    type: "string",

    __srcName: "str",

    _chunk: function( start, end ){

        return this.data.substr( start, end );

    },

} );


NGL.BinaryStreamer = function( bin, params ){

    if( bin instanceof ArrayBuffer ) bin = new Uint8Array( bin );

    NGL.Streamer.call( this, bin, params );

};

NGL.BinaryStreamer.prototype = NGL.createObject(

    NGL.Streamer.prototype, {

    constructor: NGL.BinaryStreamer,

    type: "binary",

    __srcName: "bin",

    getTransferable: function(){

        var transferable = NGL.Streamer.prototype.getTransferable.call( this );

        if( this.bin instanceof Uint8Array ){
            transferable.push( this.bin.buffer );
        }

        return transferable;

    }

} );