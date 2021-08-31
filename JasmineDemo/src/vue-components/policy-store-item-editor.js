/**
 * Define a new component called policy-store-item-editor
 */
Vue.component('policy-store-item-editor', {
    props: {
        policy: Object
    },
    template: `
<form>
    <label class="col-xs-2 control-label fw-bold">{{policy.PolicyID > 0 ? 'Edit' : 'Add'}} Policy {{policy.PolicyRef}}</label>

    <div class="form-group row mb-1">
        <label for="Policy-PolicyID" class="col-sm-2 col-form-label">ID</label>
        <div class="col-sm-10">
            <input type="text" readonly class="form-control-plaintext" id="Policy-PolicyID" v-bind:value="policy.PolicyID" />
        </div>
    </div>
    <div class="form-group row mb-1">
        <label for="Policy-PolicyRef" class="col-sm-2 col-form-label">Ref</label>
        <div class="col-sm-10">
            <input type="text" class="form-control" id="Policy-PolicyRef" placeholder="Ref" v-bind:value="policy.PolicyRef" />
        </div>
    </div>
    <div class="form-group row mb-1">
        <label for="Policy-CustomerID" class="col-sm-2 col-form-label">Customer ID</label>
        <div class="col-sm-10">
            <input type="text" class="form-control" id="Policy-CustomerID" placeholder="Customer ID" v-bind:value="policy.CustomerID" />
        </div>
    </div>
</form>`

});
