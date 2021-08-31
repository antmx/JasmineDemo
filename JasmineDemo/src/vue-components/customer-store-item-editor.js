/**
 * Define a new component called customer-store-item-editor
 */
Vue.component('customer-store-item-editor', {
    data: function () {
        return {
            xcustomer: { CustomerID: 1, CustomerName: 'A Test', CustomerRef: 'CUST001' }
        };
    },
    props: {
        //customerId: Number,
        //customerName: String,
        customer: Object
    },
    template: `
<form>
    <label class="col-xs-2 control-label fw-bold">{{customer.CustomerID > 0 ? 'Edit' : 'Add'}} Customer {{customer.CustomerName}}</label>

    <div class="form-group row mb-1">
        <label for="CustomerID" class="col-sm-2 col-form-label">ID</label>
        <div class="col-sm-10">
            <input type="text" readonly class="form-control-plaintext" xid="CustomerID" v-bind:value="customer.CustomerID" />
        </div>
    </div>
    <div class="form-group row mb-1">
        <label for="CustomerName" class="col-sm-2 col-form-label">Name</label>
        <div class="col-sm-10">
            <input type="text" class="form-control" xid="CustomerName" placeholder="Name" v-bind:value="customer.CustomerName" />
        </div>
    </div>
    <div class="form-group row mb-1">
        <label for="CustomerRef" class="col-sm-2 col-form-label">Ref</label>
        <div class="col-sm-10">
            <input type="text" class="form-control" xid="CustomerRef" placeholder="Ref" v-bind:value="customer.CustomerRef" />
        </div>
    </div>
</form>`

});
