/**
 * Vue Components for FluxGPU
 *
 * 基于 IGPUAdapter 的六边形架构
 */

import { defineComponent, ref, h, onMounted, watch, type PropType, type ShallowRef } from 'vue';
import type { ICommandEncoder } from '@fluxgpu/contracts';
import { AdapterExecutor } from '@fluxgpu/engine';
import { useGPU, useGPUFrame } from './composables.js';

// ============================================================================
// GPUCanvas - GPU Canvas 组件
// ============================================================================

export const GPUCanvas = defineComponent({
  name: 'GPUCanvas',

  props: {
    width: { type: Number, default: 800 },
    height: { type: Number, default: 600 },
    devicePixelRatio: { type: Boolean, default: true },
    autoStart: { type: Boolean, default: true },
  },

  emits: ['ready', 'error', 'render'],

  setup(props, { emit, expose, slots }) {
    const canvasRef = ref<HTMLCanvasElement | null>(null);
    const { adapter, executor, error, isLoading } = useGPU(canvasRef);

    // 设置 canvas 尺寸
    watch(
      [() => props.width, () => props.height, () => props.devicePixelRatio],
      () => {
        const canvas = canvasRef.value;
        if (!canvas) return;

        const dpr = props.devicePixelRatio ? window.devicePixelRatio : 1;
        canvas.width = props.width * dpr;
        canvas.height = props.height * dpr;
      },
      { immediate: true }
    );

    // 回调
    watch(executor, (e) => {
      if (e) emit('ready', e);
    });

    watch(error, (e) => {
      if (e) emit('error', e);
    });

    // 渲染循环
    const { start, stop, isRunning } = useGPUFrame(
      executor,
      (encoder, deltaTime) => {
        emit('render', { encoder, deltaTime, executor: executor.value });
      },
      props.autoStart
    );

    // 暴露方法
    expose({ canvas: canvasRef, adapter, executor, start, stop, isRunning });

    return () =>
      h(
        'div',
        {
          style: {
            position: 'relative',
            width: `${props.width}px`,
            height: `${props.height}px`,
          },
        },
        [
          h('canvas', {
            ref: canvasRef,
            style: { width: '100%', height: '100%', display: 'block' },
          }),

          isLoading.value &&
            h(
              'div',
              {
                style: {
                  position: 'absolute',
                  inset: '0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(0,0,0,0.5)',
                  color: 'white',
                },
              },
              'Loading WebGPU...'
            ),

          error.value &&
            h(
              'div',
              {
                style: {
                  position: 'absolute',
                  inset: '0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(255,0,0,0.2)',
                  color: 'red',
                },
              },
              error.value.message
            ),

          slots.default?.(),
        ]
      );
  },
});

// ============================================================================
// GPUStats - 性能统计组件
// ============================================================================

export const GPUStats = defineComponent({
  name: 'GPUStats',

  props: {
    executor: { type: Object as PropType<AdapterExecutor | null>, default: null },
    position: {
      type: String as PropType<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'>,
      default: 'top-right',
    },
  },

  setup(props) {
    const fps = ref(0);
    const frameCount = ref(0);
    const lastTime = ref(performance.now());

    // FPS 计算
    const updateFPS = () => {
      frameCount.value++;
      const now = performance.now();
      if (now - lastTime.value > 1000) {
        fps.value = Math.round(frameCount.value / ((now - lastTime.value) / 1000));
        frameCount.value = 0;
        lastTime.value = now;
      }
      requestAnimationFrame(updateFPS);
    };

    onMounted(() => {
      updateFPS();
    });

    return () => {
      const posStyle: Record<string, string> = {
        position: 'absolute',
        padding: '8px 12px',
        background: 'rgba(0,0,0,0.7)',
        color: 'white',
        fontFamily: 'monospace',
        fontSize: '12px',
        borderRadius: '4px',
      };

      if (props.position.includes('top')) posStyle.top = '8px';
      else posStyle.bottom = '8px';

      if (props.position.includes('right')) posStyle.right = '8px';
      else posStyle.left = '8px';

      return h('div', { style: posStyle }, [
        h('div', `FPS: ${fps.value}`),
        props.executor && h('div', `Format: ${props.executor.getPreferredFormat()}`),
      ]);
    };
  },
});
