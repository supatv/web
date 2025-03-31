<script>
    import { page } from "$app/state";
</script>

<div class="text-center">
    <h1 class="text-2xl">Error {page.status}</h1>
    <p class="text-xl">{page?.error?.message}</p>
</div>
