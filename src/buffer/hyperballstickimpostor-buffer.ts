/**
 * @file Hyperball Stick Impostor Buffer
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 * @private
 */

import { Matrix4 } from 'three'

import '../shader/HyperballStickImpostor.vert'
import '../shader/HyperballStickImpostor.frag'

import MappedBoxBuffer from './mappedbox-buffer'
import { BufferDefaultParameters, BufferParameterTypes, BufferData } from './buffer'

interface HyperballStickImpostorBufferData extends BufferData {
  position1: Float32Array
  position2: Float32Array
  color2: Float32Array
  radius: Float32Array
  radius2: Float32Array
}

export const HyperballStickImpostorBufferDefaultParameters = Object.assign({
  shrink: 0.14
}, BufferDefaultParameters)
type HyperballStickImpostorBufferParameters = typeof HyperballStickImpostorBufferDefaultParameters

const HyperballStickImpostorBufferParameterTypes = Object.assign({
  shrink: { uniform: true }
}, BufferParameterTypes)

/**
 * Hyperball stick impostor buffer.
 *
 * @example
 * var hyperballStickImpostorBuffer = new HyperballStickImpostorBuffer({
 *   position1: new Float32Array([ 0, 0, 0 ]),
 *   position2: new Float32Array([ 2, 2, 2 ]),
 *   color: new Float32Array([ 1, 0, 0 ]),
 *   color2: new Float32Array([ 0, 1, 0 ]),
 *   radius: new Float32Array([ 1 ]),
 *   radius2: new Float32Array([ 2 ])
 * });
 */
class HyperballStickImpostorBuffer extends MappedBoxBuffer {
  parameterTypes = HyperballStickImpostorBufferParameterTypes
  get defaultParameters() { return HyperballStickImpostorBufferDefaultParameters }
  parameters: HyperballStickImpostorBufferParameters

  isImpostor = true
  vertexShader = 'HyperballStickImpostor.vert'
  fragmentShader = 'HyperballStickImpostor.frag'

  /**
   * @param  {Object} data - attribute object
   * @param  {Float32Array} data.position1 - from positions
   * @param  {Float32Array} data.position2 - to positions
   * @param  {Float32Array} data.color - from colors
   * @param  {Float32Array} data.color2 - to colors
   * @param  {Float32Array} data.radius - from radii
   * @param  {Float32Array} data.radius2 - to radii
   * @param  {Picker} data.picking - picking ids
   * @param  {BufferParameters} params - parameter object
   */
  constructor (data: HyperballStickImpostorBufferData, params: Partial<HyperballStickImpostorBufferParameters> = {}) {
    super(data, params)

    this.addUniforms({
      'modelViewProjectionMatrix': { value: new Matrix4() },
      'modelViewProjectionMatrixInverse': { value: new Matrix4() },
      'modelViewMatrixInverseTranspose': { value: new Matrix4() },
      'shrink': { value: this.parameters.shrink }
    })

    this.addAttributes({
      'position1': { type: 'v3', value: null },
      'position2': { type: 'v3', value: null },
      'color2': { type: 'c', value: null },
      'radius': { type: 'f', value: null },
      'radius2': { type: 'f', value: null }
    })

    this.setAttributes(data)
    this.makeMapping()
  }
}

export default HyperballStickImpostorBuffer
