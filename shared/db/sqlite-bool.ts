import {
	type KyselyPlugin,
	OperationNodeTransformer,
	type PluginTransformQueryArgs,
	type PluginTransformResultArgs,
	type QueryResult,
	type RootOperationNode,
	type UnknownRow,
	ValueNode,
} from 'kysely';

export class SqliteBooleanPlugin implements KyselyPlugin {
	readonly #transformer = new SqliteBooleanTransformer();

	transformQuery(args: PluginTransformQueryArgs): RootOperationNode {
		return this.#transformer.transformNode(args.node);
	}

	transformResult(args: PluginTransformResultArgs): Promise<QueryResult<UnknownRow>> {
		return Promise.resolve(args.result);
	}
}

class SqliteBooleanTransformer extends OperationNodeTransformer {
	transformValue(node: ValueNode): ValueNode {
		return {
			...super.transformValue(node),
			value: typeof node.value === 'boolean' ? (node.value ? 1 : 0) : node.value,
		};
	}
}
