const { loadAllItems, loadPromotions } = require('./database.js');

// 格式化输出货币数值
const fmt = n => n.toFixed(2);

module.exports = function printInventory(inputs) {
    const Items = loadAllItems();
    const Promotions = loadPromotions();

    const List = inputs.map(i => {
        // 解析编码 ['ITEM000000-4'] => [{ barcode, count, price, name, unit }]
        let [barcode, count] = i.split('-');
        count = parseInt(count || 1);
        return { ...Items.find(i => i.barcode === barcode), count };
    }).reduce((x, i) => {
        // 合并数量
        const { barcode, count } = i;
        let target = x.find(i => i.barcode === barcode);
        if (target) target.count += count;
        else x.push(i)
        return x
    }, []);

    // 原价
    const prime = List.reduce((x, { price, count }) => x += price * count, 0);

    // 挥泪优惠
    let saved = 0;
    List.map(item => {
        const { barcode, count, price } = item;
        item.gifts = [];
        Promotions.map(({ type, barcodes }) => {
            // 买二送一
            if (type === 'BUY_TWO_GET_ONE_FREE' && barcodes.indexOf(barcode) > -1) {
                item.giftCount = ~~(count / 3);
                saved += item.giftCount * price;
            }
        });
    });

    // 找出有送的商品
    const Free = List.filter(i => !!i.giftCount);

    // 小票
    const output = [
        '***<没钱赚商店>购物清单***',
        ...List.map(({ name, count, unit, price, giftCount = 0 }) => `名称：${name}，数量：${count}${unit}，单价：${fmt(price)}(元)，小计：${fmt((count - giftCount)*price)}(元)`),
        ...(Free.length ? [
            '----------------------',
            '挥泪赠送商品：',
            ...Free.map(({ name, giftCount, unit }) => `名称：${name}，数量：${giftCount}${unit}`)
        ]: []),
        '----------------------',
        `总计：${fmt(prime - saved)}(元)`,
        saved > 0 ? `节省：${fmt(saved)}(元)` : '',
        '**********************'
    ].join('\n');

    // 输出到控制台
    console.log(output);

    return output;
};