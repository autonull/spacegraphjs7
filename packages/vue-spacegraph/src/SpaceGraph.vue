<template>
  <div ref="container" class="spacegraph-container" :style="customStyle"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { SpaceGraph } from 'spacegraphjs';
import type { GraphSpec, SpaceGraphOptions } from 'spacegraphjs';

const props = defineProps<{
  spec?: GraphSpec;
  url?: string;
  options?: SpaceGraphOptions;
  customStyle?: Record<string, any>;
}>();

const emit = defineEmits<{
  (e: 'ready', sg: SpaceGraph): void
}>();

const container = ref<HTMLElement | null>(null);
let sgInstance: SpaceGraph | null = null;

const initGraph = async () => {
  if (!container.value) return;
  
  if (sgInstance) {
    sgInstance.dispose();
    sgInstance = null;
  }

  if (props.url) {
    sgInstance = await SpaceGraph.fromURL(props.url, container.value, props.options);
    emit('ready', sgInstance);
  } else {
    sgInstance = new SpaceGraph(container.value, props.options);
    if (props.spec) {
      sgInstance.graph.fromJSON(props.spec);
    }
    emit('ready', sgInstance);
  }
};

onMounted(() => {
  initGraph();
});

watch(() => props.spec, (newSpec) => {
  // simple re-init for now
  initGraph();
}, { deep: true });

watch(() => props.url, () => {
  initGraph();
});

onBeforeUnmount(() => {
  if (sgInstance) {
    sgInstance.dispose();
  }
});
</script>

<style scoped>
.spacegraph-container {
  width: 100%;
  height: 100%;
}
</style>
