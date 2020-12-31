/**
 * Tree控件
 * 支持大数据量
 * 使用方法：
 * tree(sNode, options)
 * options:
 *   indent: number, 节点缩进值
 * height: tree的高度
 * lineHeight: 每行的高度。大数据量时为了精准定位，必须指定每行的高度。因此不支持换行显示。
 * 
 */
; (function (factory, utils) {
    const config = {
        indent: 20, // 子级缩进的宽度px
        height: 300, // tree控件的高度px
        lineHeight: 26, // 行高
        maxLine: 300 // 虚拟滚动的最小行数。总行数小于该值时使用浏览器的标准滚动机制
    };
    window.tree = factory(config, utils);
})(function (config, utils) {
    return function (root, props) {
        const $ = utils.$;
        const delay = utils.runDelay();
        const state = utils.extendAttr({
            scrollTop: 0,
        }, config, props);

        // 根据子节点设置父节点的选中状态
        function updateNodeChecked() {
            function update(datas) {
                let checkedCount = 0;
                datas.forEach(function(node) {
                    if (node.children) {
                        const checked = update(node.children);
                        if (0 === checked) {
                            node.checked = 'none';
                        } else if(node.children.length === checked) {
                            node.checked = 'all';
                        } else {
                            node.checked = 'half';
                        }
                    }

                    if ('all' === node.checked) {
                        checkedCount += 1;
                    } else if ('half' === node.checked) {
                        checkedCount += 0.5;
                    }
                });
                return checkedCount;
            }

            update(state.treeData);
        }

        // 设置各子节点的选中状态
        function setNodeChecked(datas, status) {
            function _set(datas) {
                datas.forEach(function(node) {
                    node.checked = status;
                    if (node.children) {
                        _set(node.children);
                    }
                });
            }
            _set(datas);
        }

        // 点击事件定义
        const ClickHandler = {
            onItemClick: function (node) {
                // ['none','half','all']
                node.checked = ('all' === node.checked) ? 'none' : 'all';
                if (node.children) {
                    setNodeChecked(node.children, node.checked);
                }
                updateNodeChecked();

                if (state.onChange) {
                    state.onChange(node);
                }

                setState({treeData: state.treeData});
            },
            onExpand: function (node) {
                if (!node.children) {
                    return;
                }
                node.expand = !node.expand;
                setState({treeData: state.treeData});
            }
        }

        // DOM与事件的映射关系
        const ClickMap = {
            '.tree-item': 'onItemClick',
            '.tree-item .icon-node': 'onExpand',
        };

        function setState(oState, bForceRender) {
            utils.extendAttr(state, oState);

            // 视窗中显示的最大行数
            state.maxRows = state.height / state.lineHeight;

            // 视窗上下各隐藏一屏, 滚动超过该值时使用虚拟滚动
            state.vscroll = state.height;

            delay(function() {
                utils.DOMRender(root, render())
            }, bForceRender);
        }

        // 节点图标
        function renderIcon(nodeData) {
            const status = nodeData.expand ? 'open' : 'close';
            return nodeData.children ? '<span class="icon icon-node icon-node-'+status+'"></span>' : '<span class="icon icon-leaf"></span>';
        }

        // 节点前的缩进
        function renderIndent(nLevel) {
            return '<span class="tree-item-indent" style="width: ' + (nLevel * state.indent) + 'px"></span>';
        }

        // 生成一条数据。树形的层次关系通过缩进来表现，在DOM结构上各层是平级的
        function renderItems(datas) {
            const aHtml = [];
            const multiple = state.multiple;
            function _render(datas, nLevel) {
                datas.forEach(function (data) {
                    const checked = data.checked || 'none';
                    aHtml.push([
                        '<div class="tree-item checked-'+checked+'" value="' + data.value + '">',
                        renderIndent(nLevel),
                        renderIcon(data),
                        multiple ? ('<span class="icon icon-check-'+checked+'"></span>') : '',
                        data.title,
                        '</div>'
                    ].join(''));
                    if (data.children && data.expand) {
                        _render(data.children, nLevel + 1)
                    }
                });
            }

            _render(datas, 0);
            return aHtml;
        }

        // 生成上部或者下部的空白区域
        function renderSpace(nHeight) {
            if (nHeight <= 0) {
                return '';
            }

            return '<div style="height: ' + nHeight + 'px"></div>';
        }

        // 生成HTML
        function render() {
            const aHtml = renderItems(state.treeData);

            if (aHtml.length < state.maxLine) {
                return aHtml.join('');
            }

            // 根据滚动条的位置截取要渲染的内容
            const totalHeight = aHtml.length * state.lineHeight;
            const containerHeight = state.height;
            const beforeHeight = Math.max(state.scrollTop - state.vscroll, 0);
            const nFrom = Math.floor(beforeHeight / state.lineHeight);
            const afterHeight = Math.max(totalHeight - containerHeight - state.scrollTop - state.vscroll, 0);

            // console.log('render:', beforeHeight, nFrom, afterHeight)
            return [
                renderSpace(beforeHeight),
                utils.getSubItems(aHtml, nFrom, 3*state.maxRows).join(''),
                renderSpace(afterHeight),
            ].join('');
        }

        // 生成DOM结构，并绑定事件
        $(root).on('click', function (e) {
            Object.keys(ClickMap).forEach(function (selector) {
                if ($(e.target).is(selector)) {
                    let itemNode = $(e.target).closest('.tree-item')[0];
                    const value = itemNode.getAttribute('value');
                    const node = utils.getNodeByValue(state.treeData, value);
                    const sMethod = ClickMap[selector];
                    ClickHandler[sMethod].apply(e.target, [node]);
                }
            });
        }).on('scroll', function(e) {
            // 滚动超过1/4屏时重新渲染
            // console.log('scroll:',e.target.scrollTop, state.scrollTop - e.target.scrollTop)
            if (Math.abs(state.scrollTop - e.target.scrollTop) < (state.height / 4)) {
                return;
            }
            setState({scrollTop: e.target.scrollTop}, true);
        }).css({maxHeight: state.height})

        setState({}, true);
        return {
            setOption: function(opt) {
                setState(opt, true);
            },
            destory: function () {
                //destory
                $(root).off('scroll').off('click').empty();
            }
        }
    }
}, {
    $: window.jQuery,
    runDelay: function (milTime) {
        var timer = null;
        var nTime = (undefined === milTime) ? 50 : milTime;
        return function(fnAction, bAtOnce) {
            if (timer) {
                clearTimeout(timer);
                timer = null;
            }

            if (bAtOnce) {
                return fnAction();
            }

            timer = setTimeout(function() {
                timer = null;
                fnAction();
            }, nTime);
        }
    },
    DOMRender: function(dom, html) {
        return $(dom).html(html);
    },
    getNodeByValue: function (datas, value) {
        var node = null;
        function _find(datas) {
            return datas.find(function (data) {
                if (data.value === value) {
                    node = data;
                    return true;
                }
                if (data.children) {
                    return _find(data.children);
                }
                return false;
            });
        }
        _find(datas);
        return node;
    },
    extendAttr: function (src, tar1, tar2) {
        var oSrc = src || {};
        var tars = [];
        if (tar1) {
            tars.push(tar1);
        }
        if (tar2) {
            tars.push(tar2);
        }

        tars.forEach(function(tar) {
            Object.keys(tar).forEach(function(sName){
                oSrc[sName] = tar[sName];
            });
        });
        return oSrc;
    },
    getSubItems: function (datas, nFrom, nLen) {
        const a = [];
        const nMax = Math.min(nFrom + nLen, datas.length);
        for (let i = nFrom; i < nMax; i++) {
            a.push(datas[i]);
        }
        return a;
    }
});
