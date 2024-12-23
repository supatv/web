<script>
    import { page } from "$app/state";
</script>

<div class="text-center">
    <h1 class="text-2xl">Error</h1>
    <p class="text-xl">{page.status} {page?.error?.message}</p>
</div>
