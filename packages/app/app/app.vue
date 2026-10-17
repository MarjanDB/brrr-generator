<template>
  <ToastProvider>
    <TooltipProvider>
      <NuxtRouteAnnouncer />

      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>

      <ToastViewport
        class="fixed bottom-0 right-0 z-[100] w-full max-w-[400px] p-4 gap-2 flex flex-col-reverse"
      />
    </TooltipProvider>
  </ToastProvider>
</template>
