// controllers/productController.js
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://wpxpukbvynxawfxcdroj.supabase.co',
  'YOUR_SERVICE_ROLE_KEY'
)

exports.getProducts = async (req, res) => {
  const { data, error } = await supabase
    .from('products')
    .select('product_source, product_name, description, price, qr_url, banner_url')
    .eq('active', true)

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  return res.json(data)
}
